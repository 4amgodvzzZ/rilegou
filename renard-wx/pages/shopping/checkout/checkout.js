var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

var app = getApp();

Page({
  data: {
    checkedGoodsList: [],
    checkedAddress: {},
    checkedCoupon: [],
    goodsTotalPrice: 0.00, //商品总价
    freightPrice: 0.00, //快递费
    couponPrice: 0.00, //优惠券的价格
    grouponPrice: 0.00, //团购优惠价格
    orderTotalPrice: 0.00, //订单总价
    actualPrice: 0.00, //实际需要支付的总价
    cartId: 0,
    addressId: 0,
    couponId: 0,
    grouponLinkId: 0, //参与的团购，如果是发起则为0
    grouponRulesId: 0, //团购规则ID
    oldfreightPrice:0.00, //用于自提切换存运费用
    oldactualPrice:0.00, //用于自提切换实付金额用
    selfMentionSign:0, //是否自提标志 传后台用于订单金额计算
    userLocation:{},//当前用户地理位置信息
    regionId: 0,//当前用户绑定的代理商地址信息
    parentRegionId: 0//当前用户所在地级市信息
  },
  onLoad: function(options) {
    // 页面初始化 options为页面跳转所带来的参数
  },

  //获取checkou信息
  getCheckoutInfo: function() {
    let that = this;
    util.request(api.CartCheckout, {
      cartId: that.data.cartId,
      addressId: that.data.addressId,
      couponId: that.data.couponId,
      grouponRulesId: that.data.grouponRulesId
    }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          checkedGoodsList: res.data.checkedGoodsList,
          checkedAddress: res.data.checkedAddress,
          actualPrice: res.data.actualPrice,
          //checkedCoupon: res.data.checkedCoupon,
          couponPrice: res.data.couponPrice,
          grouponPrice: res.data.grouponPrice,
          freightPrice: res.data.freightPrice,
          goodsTotalPrice: res.data.goodsTotalPrice,
          orderTotalPrice: res.data.orderTotalPrice,
          addressId: res.data.addressId,
          //couponId: res.data.couponId,
          grouponRulesId: res.data.grouponRulesId,
          oldfreightPrice: res.data.freightPrice,
          oldactualPrice: res.data.actualPrice,
        });
      }
      wx.hideLoading();
    });
  },
  selectAddress() {
    wx.navigateTo({
      url: '/pages/ucenter/address/address',
    })
  },
  
  //自提或者送上门 进行运费跟实付金额的计算
  selfMention(e){
    let that = this;
    var oldfreightPrice = e.currentTarget.dataset.oldfreightprice
    var oldactualPrice = e.currentTarget.dataset.oldactualprice
    
    if (e.detail.value){
      this.setData({
        actualPrice: oldactualPrice - oldfreightPrice,
        freightPrice: 0,
        selfMentionSign: 1
      })
    }else{
      this.setData({
        freightPrice: oldfreightPrice,
        actualPrice: oldactualPrice,
        selfMentionSign: 0
      })
    }
  },

  onReady: function() {
    // 页面渲染完成

  },
  onShow: function() {
    // 页面显示
    wx.showLoading({
      title: '加载中...',
    });
    try {
      var cartId = wx.getStorageSync('cartId');
      var angentInfo = wx.getStorageSync('angentInfo');
      
      if (Object.keys(angentInfo).length > 0 ) {
        this.setData({
          'regionId': angentInfo.regionId,
          'parentRegionId': angentInfo.pRegId
        });
      }else{
        this.setData({
          'regionId': 0,
          'parentRegionId': 0
        });
      }

      if (cartId) {
        this.setData({
          'cartId': cartId
        });
      }

      var addressId = wx.getStorageSync('addressId');
      if (addressId) {
        this.setData({
          'addressId': addressId
        });
      }

      var couponId = wx.getStorageSync('couponId');
      if (couponId) {
        this.setData({
          'couponId': couponId
        });
      }

      var grouponRulesId = wx.getStorageSync('grouponRulesId');
      if (grouponRulesId) {
        this.setData({
          'grouponRulesId': grouponRulesId
        });
      }

      var grouponLinkId = wx.getStorageSync('grouponLinkId');
      if (grouponLinkId) {
        this.setData({
          'grouponLinkId': grouponLinkId
        });
      }
    } catch (e) {
      // Do something when catch error
      console.log(e);
    }

    this.getCheckoutInfo();
  },
  onHide: function() {
    // 页面隐藏

  },
  onUnload: function() {
    // 页面关闭

  },
  submitOrder: function() {
    if (this.data.addressId <= 0) {
      util.showErrorToast('请选择收货地址');
      return false;
    }
    if (this.data.regionId <= 0) {
      wx.showToast({
        title: '请先选择门店',
        icon: 'loading',
        duration: 1500
      });
      setTimeout(function () {
        wx.navigateTo({
          url: '../../shoplist/shoplist'
        })
      }, 1500)
      return false;
    }
    util.request(api.OrderSubmit, {
      cartId: this.data.cartId,
      addressId: this.data.addressId,
      couponId: this.data.couponId,
      grouponRulesId: this.data.grouponRulesId,
      grouponLinkId: this.data.grouponLinkId,
      selfMentionSign: this.data.selfMentionSign,
      regionId: this.data.regionId,
      parentRegionId: this.data.parentRegionId
    }, 'POST').then(res => {
      if (res.errno === 0) {
        const orderId = res.data.orderId;
        util.request(api.OrderPrepay, {
          orderId: orderId
        }, 'POST').then(function(res) {
          if (res.errno === 0) {
            const payParam = res.data;
            console.log("支付过程开始");
            wx.requestPayment({
              'timeStamp': payParam.timeStamp,
              'nonceStr': payParam.nonceStr,
              'package': payParam.packageValue,
              'signType': payParam.signType,
              'paySign': payParam.paySign,
              'success': function(res) {
                console.log("支付过程成功");
                wx.redirectTo({
                  url: '/pages/payResult/payResult?status=1&orderId=' + orderId
                });
              },
              'fail': function(res) {
                console.log("支付过程失败");
                wx.redirectTo({
                  url: '/pages/payResult/payResult?status=0&orderId=' + orderId
                });
              },
              'complete': function(res) {
                console.log("支付过程结束")
              }
            });
          } else {
            wx.redirectTo({
              url: '/pages/payResult/payResult?status=0&orderId=' + orderId
            });
          }
        });

      } else {
        util.showErrorToast(res.errmsg);
      }
    });
  }
});