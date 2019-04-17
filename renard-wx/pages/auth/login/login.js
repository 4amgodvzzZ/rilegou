var api = require('../../../config/api.js');
var util = require('../../../utils/util.js');
var user = require('../../../utils/user.js');

var app = getApp();
Page({
  data: {},
  onLoad: function(options) {
    // 页面初始化 options为页面跳转所带来的参数
    // 页面渲染完成

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

  },
  wxLogin: function(e) {
    if (e.detail.userInfo == undefined) {
      app.globalData.hasLogin = false;
      util.showErrorToast('微信登录失败');
      return;
    }

    user.checkLogin().catch(() => {
      var regionid = app.globalData.regionid;
      
      user.loginByWeixin(e.detail.userInfo, regionid).then(res => {
        app.globalData.hasLogin = true;
        if (res.data.angentInfo){
          wx.setStorageSync('angentInfo', res.data.angentInfo)
          wx.setStorageSync('regionInfo', res.data.regionInfo)
          
          app.globalData.regionid = res.data.angentInfo.regionId;
          app.globalData.parentregionid = res.data.angentInfo.pRegId;
        }
        if (res.data.userId > 0){
          app.globalData.userid = res.data.userId;
        }
        
        wx.navigateBack({
          delta: 1
        })
      }).catch((err) => {
        app.globalData.hasLogin = false;
        util.showErrorToast('微信登录失败');
      });

    });
  }
})