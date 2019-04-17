var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');
var user = require('../../../utils/user.js');
var app = getApp();

Page({
  data: {
    aboutShow: true,
    modalHidden: true,
    userInfo: {
      nickName: '点击登录',
      avatarUrl: '/images/loginavt.png'
    }
  },
  onLoad: function(options) {
    this.getagentinfo();
  },
  onReady: function() {

  },
  onShow: function() {

    //获取用户的登录信息
    if (app.globalData.hasLogin) {
      let userInfo = wx.getStorageSync('userInfo');
      this.setData({
        aboutShow: true,
        userInfo: userInfo,
      });
      //获取用户数据库中信息  判断是否为代理点
      this.getAuthInfo();
    }
  },
  onHide: function() {
    // 页面隐藏

  },
  onUnload: function() {
    // 页面关闭
  },
  getagentinfo:function(){
    let that = this;
    let agentinfo = wx.getStorageSync('angentInfo');
    if (Object.keys(agentinfo).length>0){
      that.setData({
        aphone: agentinfo.phone,
        aaddr: agentinfo.address,
      })
    }else{
      that.setData({
        aphone: '暂无',
        aaddr: '暂无',
      })
    }
  },
  getAuthInfo(){
    let that = this;
    util.request(api.AuthInfo, {
      
    }).then(function (res) {
      if (res.errno === 0){
        app.globalData.userLevel = res.data.authInfo.userLevel;
        that.setData({
          userLevel: res.data.authInfo.userLevel
        })
      }
    });
  },
  goLogin() {
    if (!app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    }
  },
  goOrder() {
    if (app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/ucenter/order/order"
      });
    } else {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    }
  },
  //代理点卖出的订单列表
  goSaleOrder() {
    if (app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/ucenter/saleorder/saleorder"
      });
    } else {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    }
  },
  goCoupon() {
    if (app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/ucenter/coupon/coupon"
      });
    } else {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    };

  },
  goGroupon() {
    if (app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/groupon/myGroupon/myGroupon"
      });
    } else {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    };
  },
  goCollect() {
    if (app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/ucenter/collect/collect"
      });
    } else {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    };
  },
  goFootprint() {
    if (app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/ucenter/footprint/footprint"
      });
    } else {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    };
  },
  goAddress() {
    if (app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/ucenter/address/address"
      });
    } else {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    };
  },
  aboutUs: function () {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },
  bindPhoneNumber: function (e) {
    if (e.detail.errMsg !== "getPhoneNumber:ok") {
      // 拒绝授权
      return;
    }

    if (!this.data.hasLogin) {
      wx.showToast({
        title: '绑定失败：请先登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    util.request(api.AuthBindPhone, {
      iv: e.detail.iv,
      encryptedData: e.detail.encryptedData
    }, 'POST').then(function (res) {
      if (res.errno === 0) {
        wx.showToast({
          title: '绑定手机号码成功',
          icon: 'success',
          duration: 2000
        });
      }
    });
  },
  goFeedback(e) {
    if (app.globalData.hasLogin) {
      wx.navigateTo({
        url: "/pages/ucenter/feedback/feedback"
      });
    } else {
      wx.navigateTo({
        url: "/pages/auth/login/login"
      });
    };
  },
  exitLogin: function() {
    wx.showModal({
      title: '',
      confirmColor: '#b4282d',
      content: '退出登录？',
      success: function(res) {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    })

  },
  //门店扫码确认当前二维码所需提取的货物
  wxScanCorde:function(){
    wx.scanCode({
      success(res) {
        wx.navigateTo({
          url: res.result
        });
      }
    })
  },

  //客户的待提二维码 OrderQrCode
  MywxCorde:function(){
    let that = this;
    util.request(api.OrderQrCode, {
    }).then(function (res) {
      if (res.errno === 0) {
        that.setData({
          qrurl:res.data.url
          //qrurl: '/images/cart.png'
        })

        that.showAction();
      }
    });
  },

  callPhone: function (e) {
    var that = this
    wx.makePhoneCall({
      phoneNumber: that.data.aphone,
    })
  },

  showAction: function () {
    this.setData({
      modalHidden: false,
    })
  },

  modalCandel: function () {
    // do something
    this.setData({
      modalHidden: true,
    })
  },

  modalConfirm: function () {
    // do something
    this.setData({
      modalHidden: true,
    })
  },
})