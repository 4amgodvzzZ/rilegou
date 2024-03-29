package org.linlinjava.litemall.db.service;

import com.github.pagehelper.PageHelper;
import org.linlinjava.litemall.db.dao.LitemallBrandMapper;
import org.linlinjava.litemall.db.domain.LitemallBrand;
import org.linlinjava.litemall.db.domain.LitemallBrand.Column;
import org.linlinjava.litemall.db.domain.LitemallBrandExample;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LitemallBrandService {
    @Resource
    private LitemallBrandMapper brandMapper;
    private Column[] columns = new Column[]{Column.id, Column.name, Column.desc, Column.picUrl, Column.floorPrice, Column.regionId};

    public List<LitemallBrand> queryVO(int offset, int limit,int parentregionid) {
        LitemallBrandExample example = new LitemallBrandExample();
        if (parentregionid > 0){
            example.or().andDeletedEqualTo(false).andRegionIdEqualTo(parentregionid);
        }else {
            example.or().andDeletedEqualTo(false);
        }

        example.setOrderByClause("add_time desc");
        PageHelper.startPage(offset, limit);
        return brandMapper.selectByExampleSelective(example, columns);
    }

    public int queryTotalCount() {
        LitemallBrandExample example = new LitemallBrandExample();
        example.or().andDeletedEqualTo(false);
        return (int) brandMapper.countByExample(example);
    }

    public LitemallBrand findById(Integer id) {
        return brandMapper.selectByPrimaryKey(id);
    }

    public List<LitemallBrand> querySelective(String id, String name, Integer page, Integer size, String sort, String order,Integer regionid) {
        LitemallBrandExample example = new LitemallBrandExample();
        LitemallBrandExample.Criteria criteria = example.createCriteria();

        if (!StringUtils.isEmpty(regionid)) {
            criteria.andRegionIdEqualTo(Integer.valueOf(regionid));
        }
        if (!StringUtils.isEmpty(id)) {
            criteria.andIdEqualTo(Integer.valueOf(id));
        }
        if (!StringUtils.isEmpty(name)) {
            criteria.andNameLike("%" + name + "%");
        }
        criteria.andDeletedEqualTo(false);

        if (!StringUtils.isEmpty(sort) && !StringUtils.isEmpty(order)) {
            example.setOrderByClause(sort + " " + order);
        }

        PageHelper.startPage(page, size);
        return brandMapper.selectByExample(example);
    }

    public int updateById(LitemallBrand brand) {
        brand.setUpdateTime(LocalDateTime.now());
        return brandMapper.updateByPrimaryKeySelective(brand);
    }

    public void deleteById(Integer id) {
        brandMapper.logicalDeleteByPrimaryKey(id);
    }

    public void add(LitemallBrand brand) {
        brand.setAddTime(LocalDateTime.now());
        brand.setUpdateTime(LocalDateTime.now());
        brandMapper.insertSelective(brand);
    }

    public List<LitemallBrand> all(Integer regionid) {
        LitemallBrandExample example = new LitemallBrandExample();

        example.or().andDeletedEqualTo(false).andRegionIdEqualTo(regionid);

        return brandMapper.selectByExample(example);
    }
}
