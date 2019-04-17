var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    orderId: 0,
    orderInfo: {},
    orderGoods: [],
    agentinfo: {},
    expressInfo: {},
    orderBuyUsers:{},
    flag: false,
  },
  
  onLoad: function(options) {
    // 页面初始化 options为页面跳转所带来的参数
    this.setData({
      orderId: options.id
    });
    this.getOrderDetail();
  },

  onPullDownRefresh() {
    // wx.showNavigationBarLoading() //在标题栏中显示加载
    this.getOrderDetail();
    // wx.hideNavigationBarLoading() //完成停止加载
    wx.stopPullDownRefresh() //停止下拉刷新
  },

  expandDetail: function() {
    let that = this;
    this.setData({
      flag: !that.data.flag
    })
  },

  getOrderDetail: function() {
    wx.showLoading({
      title: '加载中',
    });

    setTimeout(function() {
      wx.hideLoading()
    }, 2000);

    let that = this;
    util.request(api.OrderDetailShare, {
      orderId: that.data.orderId
    }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          orderInfo: res.data.orderInfo,
          orderGoods: res.data.orderGoods,
          agentinfo: res.data.agentinfo,
          orderBuyUsers: res.data.orderBuyUsers
        });

        wx.hideLoading();
      }
    });
  },
  callPhone: function (e) {
    var that = this
    wx.makePhoneCall({
      phoneNumber: that.data.agentinfo.phone,
    })
  },

  gohome:function(){
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },
  onReady: function() {
    // 页面渲染完成
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
});