var util = require('../../utils/util.js');
var api = require('../../config/api.js');
var app = getApp();
Page({
  data: {
    brandList: [],
    page: 1,
    size: 10,
    totalPages: 1
  },
  onLoad: function(options) {
    let that = this;
    // 页面初始化 options为页面跳转所带来的参数
    that.setData({
      parentregionid: options.parentregionid
    });
    this.getBrandList();
  },
  getBrandList: function() {
    wx.showLoading({
      title: '加载中...',
    });
    let that = this;
    util.request(api.BrandList, {
      page: that.data.page,
      size: that.data.size,
      parentregionid: that.data.parentregionid
    }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          brandList: that.data.brandList.concat(res.data.brandList),
          totalPages: res.data.totalPages,
        });
      }
      wx.hideLoading();
    });
  },
  onReachBottom() {
    if (this.data.totalPages > this.data.page) {
      this.setData({
        page: this.data.page + 1
      });
    } else {
      return false;
    }

    this.getBrandList();
  },
  onReady: function() {

  },
  onShow: function() {
    // 页面显示

  },
  onHide: function() {
    // 页面隐藏

  },
  onUnload: function() {
    // 页面关闭

  }
})