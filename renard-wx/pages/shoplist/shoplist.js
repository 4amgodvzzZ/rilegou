var util = require('../../utils/util.js');
var api = require('../../config/api.js');
var QQMapWX = require('../../utils/sdk/qqmap-wx-jssdk.min.js');

Page({
  data: {
    agentList: '',
    showType: 0
  },
  onLoad: function(options) {

    // 页面初始化 options为页面跳转所带来的参数
  },

  onPullDownRefresh() {
    // wx.showNavigationBarLoading() //在标题栏中显示加载
    this.onLoad();
    // wx.hideNavigationBarLoading() //完成停止加载
    wx.stopPullDownRefresh() //停止下拉刷新
  },

  //商家跟用户当前距离
  getagent: function(la1, lo2) {
    var that = this;
    let hw = 0;
    util.request(api.AgentList, {
      lat: that.data.lat,
      lon: that.data.lon,
    }).then(function(res) {
      if (res.errno === 0) {
        var agentlist = res.data.data
        for (var i = 0; i < agentlist.length; i++) {
          that.map(agentlist, i)
        }
      }
    })
  },

  map: function(agentlist, i) {
    let that = this;
    location = JSON.parse(agentlist[i].location);
    var qqmap = new QQMapWX({
      key: '7PYBZ-CCYWQ-JT35X-GHSQV-EHPHS-36BJY'
    });

    var hw = 0;
    // 调用腾讯地图接口
    qqmap.calculateDistance({
      to: [{
        latitude: location.latitude, //商家的纬度
        longitude: location.longitude, //商家的经度
      }],
      success: function(res) {
        hw = res.result.elements[0].distance //拿到距离(米)
        if (hw && hw !== -1) { //拿到正确的值
          //转换成公里
          hw = (hw / 2 / 500).toFixed(2)
        } else {
          hw = "距离太近或请刷新重试"
        }
        agentlist[i].location = hw;
        
        that.setData({
          agentList: agentlist
        })   
      }
    });
  },

  //用户选择某一门店后操作
  selagent: function(e) {
    let regionid = e.currentTarget.dataset.regionid;
    let parentregionid = e.currentTarget.dataset.parentregionid;

    wx.reLaunch({
      url: '../index/index?regionid=' + regionid + '&parentregionid=' + parentregionid
    });
  },

  onReady: function() {
    // 页面渲染完成
  },
  onShow: function() {
    let that = this;
    //获取当前位置信息
    wx.getLocation({
      type: 'wgs84',
      success: function(res) {
        var latitude = res.latitude
        var longitude = res.longitude
        that.setData({
          lat: latitude,
          lon: longitude
        })
        that.getagent(latitude, longitude);
      }
    })
  },
  onHide: function() {
    // 页面隐藏
  },
  onUnload: function() {
    // 页面关闭
  }
})