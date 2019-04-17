package org.linlinjava.litemall.wx.web;

import cn.binarywang.wx.miniapp.api.WxMaService;
import net.sf.json.JSONObject;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.*;
import org.linlinjava.litemall.db.service.*;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.linlinjava.litemall.wx.service.HomeCacheManager;
import org.linlinjava.litemall.wx.util.DistenceUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

/**
 * 首页服务
 */
@RestController
@RequestMapping("/wx/home")
@Validated
public class WxHomeController {
    private final Log logger = LogFactory.getLog(WxHomeController.class);

    private Integer parentregid = 0;

    @Autowired
    private LitemallAdService adService;

    @Autowired
    private LitemallGoodsService goodsService;

    @Autowired
    private LitemallBrandService brandService;

    @Autowired
    private LitemallTopicService topicService;

    @Autowired
    private LitemallCategoryService categoryService;

    @Autowired
    private LitemallGrouponRulesService grouponRulesService;

    @Autowired
    private LitemallCouponService couponService;

    @Autowired
    private LitemallAdminService litemallAdminService;

    @Autowired
    private LitemallUserService userService;

    @Autowired
    private LitemallOrderGoodsService litemallOrderGoodsService;

    @Autowired
    private LitemallGoodsProductService litemallGoodsProductService;

    @Autowired
    private LitemallRegionService litemallRegionService;

    @Autowired
    private WxMaService wxService;

    private final static ArrayBlockingQueue<Runnable> WORK_QUEUE = new ArrayBlockingQueue<>(9);

    private final static RejectedExecutionHandler HANDLER = new ThreadPoolExecutor.CallerRunsPolicy();

    private static ThreadPoolExecutor executorService = new ThreadPoolExecutor(9, 9, 1000, TimeUnit.MILLISECONDS, WORK_QUEUE, HANDLER);

    @GetMapping("/cache")
    public Object cache(@NotNull String key) {
        if (!key.equals("litemall_cache")) {
            return ResponseUtil.fail();
        }

        // 清除缓存
        HomeCacheManager.clearAll();
        return ResponseUtil.ok("缓存已清除");
    }

    /**
     * 首页数据
     * @param userId 当用户已经登录时，非空。为登录状态为null
     * @return 首页数据
     */
    @GetMapping("/index")
    public Object index(@LoginUser Integer userId,@NotNull Integer parentregionid) {
        //优先从缓存中读取
        if (HomeCacheManager.hasData(HomeCacheManager.INDEX)) {
            return ResponseUtil.ok(HomeCacheManager.getCacheData(HomeCacheManager.INDEX));
        }
        ExecutorService executorService = Executors.newFixedThreadPool(10);

        Map<String, Object> data = new HashMap<>();

        Callable<List> bannerListCallable = () -> adService.queryIndex();

        Callable<List> channelListCallable = () -> categoryService.queryChannel();

        Callable<List> couponListCallable;
        if(userId == null){
            couponListCallable = () -> couponService.queryList(0, 3);
        } else {
            couponListCallable = () -> couponService.queryAvailableList(userId,0, 3);
        }

        if (parentregionid > 0){
            this.parentregid = parentregionid;
        }

        //Callable<List> newGoodsListCallable = () -> goodsService.queryByNew(0, SystemConfig.getNewLimit(),parentregionid);
        List<LitemallGoods> newGoodsList = goodsService.queryByNew(0, SystemConfig.getNewLimit(),parentregionid);
        List<LitemallGoods> newGoodsListCallable = new ArrayList<>();
        if (newGoodsList.size()>0){
            for (LitemallGoods litemallGoods:newGoodsList){
                //单个商品的已售跟总数
                int saledCount = litemallOrderGoodsService.getCountByGid(litemallGoods.getId());
                int allCount = litemallGoodsProductService.getGoodsNum(litemallGoods.getId());
                litemallGoods.setSaledCount(saledCount);
                litemallGoods.setAllCount(allCount);
                newGoodsListCallable.add(litemallGoods);
            }
        }

        Callable<List> hotGoodsListCallable = () -> goodsService.queryByHot(0, SystemConfig.getHotLimit(),parentregionid);
        //品牌供应商
        Callable<List> brandListCallable = () -> brandService.queryVO(0, SystemConfig.getBrandLimit(),parentregionid);
        //专题
        Callable<List> topicListCallable = () -> topicService.queryList(0, SystemConfig.getTopicLimit(),parentregionid);

        //团购专区
        Callable<List> grouponListCallable = () -> grouponRulesService.queryList(0, 5,parentregionid);

        Callable<List> floorGoodsListCallable =  this::getCategoryList;

        FutureTask<List> bannerTask = new FutureTask<>(bannerListCallable);
        FutureTask<List> channelTask = new FutureTask<>(channelListCallable);
        FutureTask<List> couponListTask = new FutureTask<>(couponListCallable);
        //FutureTask<List> newGoodsListTask = new FutureTask<>(newGoodsListCallable);
        FutureTask<List> hotGoodsListTask = new FutureTask<>(hotGoodsListCallable);
        FutureTask<List> brandListTask = new FutureTask<>(brandListCallable);
        FutureTask<List> topicListTask = new FutureTask<>(topicListCallable);
        FutureTask<List> grouponListTask = new FutureTask<>(grouponListCallable);
        FutureTask<List> floorGoodsListTask = new FutureTask<>(floorGoodsListCallable);

        executorService.submit(bannerTask);
        executorService.submit(channelTask);
        executorService.submit(couponListTask);
        //executorService.submit(newGoodsListTask);
        executorService.submit(hotGoodsListTask);
        executorService.submit(brandListTask);
        executorService.submit(topicListTask);
        executorService.submit(grouponListTask);
        executorService.submit(floorGoodsListTask);

        try {
            data.put("banner", bannerTask.get());
            data.put("channel", channelTask.get());
            data.put("couponList", couponListTask.get());
            data.put("newGoodsList", newGoodsListCallable);
            data.put("hotGoodsList", hotGoodsListTask.get());
            data.put("brandList", brandListTask.get());
            data.put("topicList", topicListTask.get());
            data.put("grouponList", grouponListTask.get());
            data.put("floorGoodsList", floorGoodsListTask.get());
        }
        catch (Exception e) {
            e.printStackTrace();
        }
        //缓存数据
        HomeCacheManager.loadData(HomeCacheManager.INDEX, data);
        executorService.shutdown();
        return ResponseUtil.ok(data);
    }


    private List<Map> getCategoryList() {
        List<Map> categoryList = new ArrayList<>();
        List<LitemallCategory> catL1List = categoryService.queryL1WithoutRecommend(0, SystemConfig.getCatlogListLimit());
        for (LitemallCategory catL1 : catL1List) {
            List<LitemallCategory> catL2List = categoryService.queryByPid(catL1.getId());
            List<Integer> l2List = new ArrayList<>();
            for (LitemallCategory catL2 : catL2List) {
                l2List.add(catL2.getId());
            }

            List<LitemallGoods> categoryGoods;//数据库goods表中查出的数据
            List<LitemallGoods> nowcategoryGoods = new ArrayList<>();//加工后的数据
            if (l2List.size() == 0) {
                nowcategoryGoods = new ArrayList<>();
            } else {
                categoryGoods = goodsService.queryByCategory(l2List, 0, SystemConfig.getCatlogMoreLimit(),parentregid);
                for (LitemallGoods litemallGoods:categoryGoods){
                    //单个商品的已售跟总数
                    int saledCount = litemallOrderGoodsService.getCountByGid(litemallGoods.getId());
                    int allCount = litemallGoodsProductService.getGoodsNum(litemallGoods.getId());
                    litemallGoods.setSaledCount(saledCount);
                    litemallGoods.setAllCount(allCount);
                    nowcategoryGoods.add(litemallGoods);
                }
            }

            Map<String, Object> catGoods = new HashMap<>();
            catGoods.put("id", catL1.getId());
            catGoods.put("name", catL1.getName());
            catGoods.put("goodsList", nowcategoryGoods);
            categoryList.add(catGoods);
        }
        return categoryList;
    }

    /*
     * 获取当前用户附近商家列表
     * */
    @GetMapping("agentlist")
    public Object getagentlist(@NotNull Double lat,@NotNull Double lon){
        List<LitemallAdmin> litemallAdminList = litemallAdminService.findAdminList();
        for (LitemallAdmin adminlist:litemallAdminList) {
            //获取门店列表的门店名
            LitemallRegion litemallRegion = litemallRegionService.findById(adminlist.getRegionId());

            JSONObject mapinfo=JSONObject.fromObject(adminlist.getLocation());
            Double dis = DistenceUtil.getDistance(lat,lon,Double.valueOf(mapinfo.get("latitude").toString()),Double.valueOf(mapinfo.get("longitude").toString()));
            adminlist.setLoactionsort(dis);
            adminlist.setRegionName(litemallRegion.getName());
        }
        List<LitemallAdmin> newLitemallAdmin = litemallAdminList.stream().sorted(Comparator.comparing(LitemallAdmin::getLoactionsort))
                .collect(Collectors.toList());
        Map<String, Object> data = new HashMap<String, Object>();
        data.put("data", newLitemallAdmin);
        return ResponseUtil.ok(data);
    }

    /*
     * 查找当前用户绑定的商户信息
     * */
    @GetMapping("agentinfo")
    public Object getagentinfo(@NotNull Integer regionid,@LoginUser Integer userid){
        LitemallAdmin angentInfo  = litemallAdminService.querySelectiveLitemall(regionid,0);
        if (userid != null){
            LitemallUser user = userService.findById(userid);
            user.setRegionId(regionid);
            userService.updateById(user);
        }
        LitemallRegion litemallRegion = litemallRegionService.findById(regionid);
        int agentFans = userService.countByRegionId(regionid);
        Map<String, Object> data = new HashMap<String, Object>();
        data.put("angentInfo", angentInfo);
        data.put("agentFans", agentFans);
        data.put("regionInfo", litemallRegion);
        return ResponseUtil.ok(data);
    }
}