var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var app = getApp();

Page({
  data: {
    orderList: [],
    showType: 0,
    saleduserid:0 //二维码带的用户id参数
  },
  onLoad: function(options) {
    let that = this;
    if (options.saleduserid){
      that.setData({
        saleduserid: options.saleduserid
      })
    }else{
      that.setData({
        saleduserid: 0
      })
    }
    
  },

  onPullDownRefresh() {
    // wx.showNavigationBarLoading() //在标题栏中显示加载
    this.getOrderList();
    // wx.hideNavigationBarLoading() //完成停止加载
    wx.stopPullDownRefresh() //停止下拉刷新
  },
  
  getOrderList() {
    wx.showLoading({
      title: '加载中',
    });

    setTimeout(function() {
      wx.hideLoading()
    }, 2000);

    let that = this;
    util.request(api.AgentOrderList, {
      orderdate: this.data.dates,
      showType: that.data.showType,
      saleduserid: that.data.saleduserid
    }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          orderList: res.data.data
        });
        wx.hideLoading();
      }
    });
  },
  switchTab: function(event) {
    let showType = event.currentTarget.dataset.index;
    this.setData({
      showType: showType
    });
    this.getOrderList();
  },
  //  点击日期组件确定事件  
  bindDateChange: function (e) {
    let that = this;
    let viewdates;
    if (e.detail.value==''){
      viewdates = this.setData.dates;
    }else{
      viewdates = e.detail.value
    }
    util.request(api.AgentOrderList, {
      orderdate: viewdates,
      showType: that.data.showType,
      saleduserid: that.data.saleduserid
    }).then(function (res) {
      if (res.errno === 0) {
        that.setData({
          orderList: res.data.data,
          dates: viewdates
        });
        wx.hideLoading();
      }
    });
  },
  onReady: function() {
    // 页面渲染完成
  },
  onShow: function() {
    var date = new Date();
    let month;
    let day;
    if ((date.getMonth() + 1) < 10){
      month = "0" + (date.getMonth() + 1);
    }else{
      month = (date.getMonth() + 1);
    }

    if (date.getDate() < 10){
      day = "0" + date.getDate();
    }else{
      day = date.getDate();
    }
    var str = date.getFullYear() + "-" + month + "-" + day;
    this.setData({
      dates: str
    })
    // 页面显示
    this.getOrderList();
  },
  onHide: function() {
    // 页面隐藏
  },
  onUnload: function() {
    // 页面关闭
  }
})