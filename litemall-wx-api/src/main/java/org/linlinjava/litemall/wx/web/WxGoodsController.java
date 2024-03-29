package org.linlinjava.litemall.wx.web;

import cn.binarywang.wx.miniapp.api.WxMaQrcodeService;
import com.github.pagehelper.Page;
import com.github.pagehelper.PageInfo;
import com.mysql.jdbc.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.qcode.QCodeService;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.core.validator.Order;
import org.linlinjava.litemall.core.validator.Sort;
import org.linlinjava.litemall.db.domain.*;
import org.linlinjava.litemall.db.service.*;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

/**
 * 商品服务
 */
@RestController
@RequestMapping("/wx/goods")
@Validated
public class WxGoodsController {
	private final Log logger = LogFactory.getLog(WxGoodsController.class);

	@Autowired
	private LitemallGoodsService goodsService;

	@Autowired
	private LitemallGoodsProductService productService;

	@Autowired
	private LitemallIssueService goodsIssueService;

	@Autowired
	private LitemallGoodsAttributeService goodsAttributeService;

	@Autowired
	private LitemallBrandService brandService;

	@Autowired
	private LitemallCommentService commentService;

	@Autowired
	private LitemallUserService userService;

	@Autowired
	private LitemallCollectService collectService;

	@Autowired
	private LitemallFootprintService footprintService;

	@Autowired
	private LitemallCategoryService categoryService;

	@Autowired
	private LitemallSearchHistoryService searchHistoryService;

	@Autowired
	private LitemallGoodsSpecificationService goodsSpecificationService;

	@Autowired
	private LitemallGrouponRulesService rulesService;

	@Autowired
	private LitemallOrderGoodsService litemallOrderGoodsService;

	@Autowired
	private LitemallOrderService litemallOrderService;

	@Autowired
	private LitemallGoodsProductService litemallGoodsProductService;

	@Autowired
	private QCodeService qCodeService;

	private final static ArrayBlockingQueue<Runnable> WORK_QUEUE = new ArrayBlockingQueue<>(9);

	private final static RejectedExecutionHandler HANDLER = new ThreadPoolExecutor.CallerRunsPolicy();

	private static ThreadPoolExecutor executorService = new ThreadPoolExecutor(16, 16, 1000, TimeUnit.MILLISECONDS, WORK_QUEUE, HANDLER);

	/**
	 * 商品详情
	 * <p>
	 * 用户可以不登录。
	 * 如果用户登录，则记录用户足迹以及返回用户收藏信息。
	 *
	 * @param userId 用户ID
	 * @param id     商品ID
	 * @return 商品详情
	 */
	@GetMapping("detail")
	public Object detail(@LoginUser Integer userId, @NotNull Integer id) {
		// 商品信息
		LitemallGoods info = goodsService.findById(id);

		//该商品所有下的订单信息
		List<LitemallOrderGoods> litemallOrderGoodsList = litemallOrderGoodsService.queryByGid(id);
		List<Map<String, Object>> userOrderVo = new ArrayList<>();
		for (LitemallOrderGoods litemallOrderGoods:litemallOrderGoodsList) {
			Map<String, Object> o = new HashMap<>();
			LitemallOrder litemallOrder = litemallOrderService.findById(litemallOrderGoods.getOrderId());
			LitemallUser user = userService.findById(litemallOrder.getUserId());
			o.put("nickname", user.getNickname());
			o.put("avatar", user.getAvatar());
			userOrderVo.add(o);
		}
		// 商品属性
		Callable<List> goodsAttributeListCallable = () -> goodsAttributeService.queryByGid(id);

		// 商品规格 返回的是定制的GoodsSpecificationVo
		Callable<Object> objectCallable = () -> goodsSpecificationService.getSpecificationVoList(id);

		// 商品规格对应的数量和价格
		Callable<List> productListCallable = () -> productService.queryByGid(id);

		// 商品问题，这里是一些通用问题
		Callable<List> issueCallable = () -> goodsIssueService.query();

		// 商品品牌商
		Callable<LitemallBrand> brandCallable = ()->{
			Integer brandId = info.getBrandId();
			LitemallBrand brand;
			if (brandId == 0) {
				brand = new LitemallBrand();
			} else {
				brand = brandService.findById(info.getBrandId());
			}
			return brand;
		};

		// 评论
		Callable<Map> commentsCallable = () -> {
			List<LitemallComment> comments = commentService.queryGoodsByGid(id, 0, 2);
			List<Map<String, Object>> commentsVo = new ArrayList<>(comments.size());
			long commentCount = PageInfo.of(comments).getTotal();
			for (LitemallComment comment : comments) {
				Map<String, Object> c = new HashMap<>();
				c.put("id", comment.getId());
				c.put("addTime", comment.getAddTime());
				c.put("content", comment.getContent());
				LitemallUser user = userService.findById(comment.getUserId());
				c.put("nickname", user.getNickname());
				c.put("avatar", user.getAvatar());
				c.put("picList", comment.getPicUrls());
				commentsVo.add(c);
			}
			Map<String, Object> commentList = new HashMap<>();
			commentList.put("count", commentCount);
			commentList.put("data", commentsVo);
			return commentList;
		};

		//团购信息
		Callable<List> grouponRulesCallable = () ->rulesService.queryByGoodsId(id);

		// 用户收藏
		int userHasCollect = 0;
		if (userId != null) {
			userHasCollect = collectService.count(userId, id);
		}

		// 记录用户的足迹 异步处理
		if (userId != null) {
			executorService.execute(()->{
				LitemallFootprint footprint = new LitemallFootprint();
				footprint.setUserId(userId);
				footprint.setGoodsId(id);
				footprintService.add(footprint);
			});
		}
		FutureTask<List> goodsAttributeListTask = new FutureTask<>(goodsAttributeListCallable);
		FutureTask<Object> objectCallableTask = new FutureTask<>(objectCallable);
		FutureTask<List> productListCallableTask = new FutureTask<>(productListCallable);
		FutureTask<List> issueCallableTask = new FutureTask<>(issueCallable);
		FutureTask<Map> commentsCallableTsk = new FutureTask<>(commentsCallable);
		FutureTask<LitemallBrand> brandCallableTask = new FutureTask<>(brandCallable);
        FutureTask<List> grouponRulesCallableTask = new FutureTask<>(grouponRulesCallable);

		executorService.submit(goodsAttributeListTask);
		executorService.submit(objectCallableTask);
		executorService.submit(productListCallableTask);
		executorService.submit(issueCallableTask);
		executorService.submit(commentsCallableTsk);
		executorService.submit(brandCallableTask);
		executorService.submit(grouponRulesCallableTask);

		Map<String, Object> data = new HashMap<>();

		try {
			data.put("info", info);
			data.put("userHasCollect", userHasCollect);
			data.put("issue", issueCallableTask.get());
			data.put("comment", commentsCallableTsk.get());
			data.put("specificationList", objectCallableTask.get());
			data.put("productList", productListCallableTask.get());
			data.put("attribute", goodsAttributeListTask.get());
			data.put("brand", brandCallableTask.get());
			data.put("groupon", grouponRulesCallableTask.get());
			data.put("userOrderVo", userOrderVo);
		}
		catch (Exception e) {
			e.printStackTrace();
		}
		//当前商品的关注数
		int goodsfocus = collectService.countByGid(id);
		//商品分享图片地址
		data.put("shareImage", info.getShareUrl());
		data.put("goodsfocus", goodsfocus);
		return ResponseUtil.ok(data);
	}

	/**
	 * 商品分类类目
	 *
	 * @param id 分类类目ID
	 * @return 商品分类类目
	 */
	@GetMapping("category")
	public Object category(@NotNull Integer id) {
		LitemallCategory cur = categoryService.findById(id);
		LitemallCategory parent = null;
		List<LitemallCategory> children = null;

		if (cur.getPid() == 0) {
			parent = cur;
			children = categoryService.queryByPid(cur.getId());
			cur = children.size() > 0 ? children.get(0) : cur;
		} else {
			parent = categoryService.findById(cur.getPid());
			children = categoryService.queryByPid(cur.getPid());
		}
		Map<String, Object> data = new HashMap<>();
		data.put("currentCategory", cur);
		data.put("parentCategory", parent);
		data.put("brotherCategory", children);
		return ResponseUtil.ok(data);
	}

	/**
	 * 根据条件搜素商品
	 * <p>
	 * 1. 这里的前五个参数都是可选的，甚至都是空
	 * 2. 用户是可选登录，如果登录，则记录用户的搜索关键字
	 *
	 * @param categoryId 分类类目ID，可选
	 * @param brandId    品牌商ID，可选
	 * @param keyword    关键字，可选
	 * @param isNew      是否新品，可选
	 * @param isHot      是否热买，可选
	 * @param userId     用户ID
	 * @param page       分页页数
	 * @param size       分页大小
	 * @param sort       排序方式，支持"add_time", "retail_price"或"name"
	 * @param order      排序类型，顺序或者降序
	 * @return 根据条件搜素的商品详情
	 */
	@GetMapping("list")
	public Object list(
		Integer categoryId,
		Integer brandId,
		String keyword,
		Boolean isNew,
		Boolean isHot,
		@LoginUser Integer userId,
		@RequestParam(defaultValue = "1") Integer page,
		@RequestParam(defaultValue = "10") Integer size,
		@RequestParam(defaultValue = "0") Integer parentregionid,
		@Sort(accepts = {"add_time", "retail_price", "name"}) @RequestParam(defaultValue = "add_time") String sort,
		@Order @RequestParam(defaultValue = "desc") String order) {

		//添加到搜索历史
		if (userId != null && !StringUtils.isNullOrEmpty(keyword)) {
			LitemallSearchHistory searchHistoryVo = new LitemallSearchHistory();
			searchHistoryVo.setKeyword(keyword);
			searchHistoryVo.setUserId(userId);
			searchHistoryVo.setFrom("wx");
			searchHistoryService.save(searchHistoryVo);
		}

		//查询列表数据
		List<LitemallGoods> goodsList = goodsService.querySelective(categoryId, brandId, keyword, isHot, isNew, page, size, sort, order,parentregionid);
		List<LitemallGoods> newGoodsList = new ArrayList<>();
		if (goodsList.size()>0){
			for (LitemallGoods litemallGoods:goodsList){
				//单个商品的已售跟总数
				int saledCount = litemallOrderGoodsService.getCountByGid(litemallGoods.getId());
				int allCount = litemallGoodsProductService.getGoodsNum(litemallGoods.getId());
				litemallGoods.setSaledCount(saledCount);
				litemallGoods.setAllCount(allCount);
				newGoodsList.add(litemallGoods);
			}
		}

		// 查询商品所属类目列表。
		List<Integer> goodsCatIds = goodsService.getCatIds(brandId, keyword, isHot, isNew,parentregionid);
		List<LitemallCategory> categoryList = null;
		if (goodsCatIds.size() != 0) {
			categoryList = categoryService.queryL2ByIds(goodsCatIds);
		} else {
			categoryList = new ArrayList<>(0);
		}

		Map<String, Object> data = new HashMap<>();
		data.put("goodsList", newGoodsList);
		data.put("count", PageInfo.of(goodsList).getTotal());
		data.put("filterCategoryList", categoryList);

		return ResponseUtil.ok(data);
	}

	/**
	 * 新品首发页面的横幅
	 *
	 * @return 新品首发页面的横幅
	 */
	@GetMapping("new")
	public Object newGoods() {
		Map<String, String> bannerInfo = new HashMap<>();
		bannerInfo.put("url", "");
		bannerInfo.put("name", SystemConfig.getNewBannerTitle());
		bannerInfo.put("imgUrl", SystemConfig.getNewImageUrl());

		Map<String, Object> data = new HashMap<>();
		data.put("bannerInfo", bannerInfo);
		return ResponseUtil.ok(data);
	}

	/**
	 * 人气推荐页面的横幅
	 *
	 * @return 人气推荐页面的横幅
	 */
	@GetMapping("hot")
	public Object hotGoods() {
		Map<String, String> bannerInfo = new HashMap<>();
		bannerInfo.put("url", "");
		bannerInfo.put("name", SystemConfig.getHotBannerTitle());
		bannerInfo.put("imgUrl", SystemConfig.getHotImageUrl());
		Map<String, Object> data = new HashMap<>();
		data.put("bannerInfo", bannerInfo);
		return ResponseUtil.ok(data);
	}

	/**
	 * 商品详情页面“大家都在看”推荐商品
	 *
	 * @param id, 商品ID
	 * @return 商品详情页面推荐商品
	 */
	@GetMapping("related")
	public Object related(@NotNull Integer id,@NotNull Integer parentregionid) {
		LitemallGoods goods = goodsService.findById(id);
		if (goods == null) {
			return ResponseUtil.badArgumentValue();
		}

		// 目前的商品推荐算法仅仅是推荐同类目的其他商品
		int cid = goods.getCategoryId();

		// 查找六个相关商品
		int related = 6;
		List<LitemallGoods> goodsList = goodsService.queryByCategory(cid, 0, related,parentregionid);
		List<LitemallGoods> newGoodsList = new ArrayList<>();
		if (goodsList.size()>0){
			for (LitemallGoods litemallGoods:goodsList){
				//单个商品的已售跟总数
				int saledCount = litemallOrderGoodsService.getCountByGid(litemallGoods.getId());
				int allCount = litemallGoodsProductService.getGoodsNum(litemallGoods.getId());
				litemallGoods.setSaledCount(saledCount);
				litemallGoods.setAllCount(allCount);
				newGoodsList.add(litemallGoods);
			}
		}
		Map<String, Object> data = new HashMap<>();
		data.put("goodsList", newGoodsList);
		return ResponseUtil.ok(data);
	}

	/**
	 * 在售的商品总数
	 *
	 * @return 在售的商品总数
	 */
	@GetMapping("count")
	public Object count() {
		Integer goodsCount = goodsService.queryOnSale();
		Map<String, Object> data = new HashMap<>();
		data.put("goodsCount", goodsCount);
		return ResponseUtil.ok(data);
	}

	/*
	* 商品分享海报
	*
	* */
	@GetMapping("shareimg")
	public Object shareGoodsImg(@NotNull Integer id){
		LitemallGoods litemallGoods = goodsService.findById(id);
		String goodsImgUrl = qCodeService.createGoodShareImage(String.valueOf(id),litemallGoods.getPicUrl(),litemallGoods.getName());

		Map<String, Object> data = new HashMap<>();
		data.put("goodsImgUrl", goodsImgUrl);
		return ResponseUtil.ok(data);
	}

}