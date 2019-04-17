const util = require('../../utils/util.js');
const api = require('../../config/api.js');
const user = require('../../utils/user.js');
var timer = require('../../utils/sdk/wxTimer.js');
//获取应用实例
const app = getApp();

Page({
  data: {
    wxTimerList: {},
    newGoods: [],
    hotGoods: [],
    topics: [],
    brands: [],
    groupons: [],
    floorGoods: [],
    // banner: [],
    channel: [],
    angentInfo: '',
    agentList:'',
    parentregionid:0
  },
  onShareAppMessage: function() {
    var angentInfo = wx.getStorageSync('angentInfo')
    var regionInfo = wx.getStorageSync('regionInfo')
 
    return {
      title: '当前门店:' + regionInfo.name,
      imageUrl: angentInfo.avatar,
      desc: '唯爱与美食不可辜负',
      path: '/pages/index/index?regionid=' + angentInfo.regionId + '&parentregionid=' + angentInfo.pRegId
    }
  },

  saveFormId: function(v) {
    if (v.detail.formId != 'the formId is a mock one') {
      util.request(api.UserFormIdCreate, {
        formId: v.detail.formId
      });
    }
  },

  toggleAgent(e) {
    wx.navigateTo({
      url: '../shoplist/shoplist'
    });
  },

  
  onPullDownRefresh() {
    this.getIndexData();
    wx.stopPullDownRefresh() //停止下拉刷新
  },

  getIndexData: function() {
    // wx.showLoading({
    //   title: '加载中',
    // });

    setTimeout(function() {
      wx.hideLoading()
    }, 2000);
    
    let that = this;
    util.request(api.IndexUrl,{
      parentregionid: that.data.parentregionid
    }).then(function(res) {
      if (res.errno === 0) {
        that.setData({
          newGoods: res.data.newGoodsList,//新品首发
          hotGoods: res.data.hotGoodsList,//最上
          topics: res.data.topicList,//专题
          brands: res.data.brandList,//品牌供应商
          floorGoods: res.data.floorGoodsList,//分类
          // banner: res.data.banner,
          groupons: res.data.grouponList,
          //channel: res.data.channel
        });
        wx.hideLoading();
      }
    });
  },

  onLoad: function(options) {
    this.openLiPro();
    var that = this;
    //判断该用户进来小程序有没有带代理商门店信息
    if (options.regionid>0 || that.data.regionid >0) {
      app.globalData.regionid = options.regionid == 0 ? that.data.regionid : options.regionid;
      app.globalData.parentregionid = options.parentregionid == 0 ? that.data.parentregionid : options.parentregionid;
      var userid = app.globalData.userid;

      util.request(api.AgentInfo, {
        regionid: options.regionid,
        userid: userid
      }).then(function(res) {
        console.log(res);
        if (res.errno === 0) {
          wx.setStorageSync('angentInfo', res.data.angentInfo);
          wx.setStorageSync('agentFans', res.data.agentFans);
          wx.setStorageSync('regionInfo', res.data.regionInfo);
        
          that.setData({
            parentregionid: res.data.angentInfo.pRegId,
            address: res.data.regionInfo.name,
            angentInfo: res.data.angentInfo,
            agentFans: res.data.agentFans,
            regionInfo: res.data.regionInfo
          });
        }
      });
    }

    wx.getSystemInfo({
      success: function(res) {
        that.setData({
          windowWidth: res.windowWidth,
          windowHeight: res.windowHeight
        });
      }
    });

    if (options.scene) {
      var scene = decodeURIComponent(options.scene);
      console.log("scene:" + scene);

      let info_arr = [];
      info_arr = scene.split(',');
      let _type = info_arr[0];
      let id = info_arr[1];

      if (_type == 'goods') {
        wx.navigateTo({
          url: '../goods/goods?id=' + id
        });
      } else if (_type == 'groupon') {
        wx.navigateTo({
          url: '../goods/goods?grouponId=' + id
        });
      } else {
        wx.navigateTo({
          url: '../index/index'
        });
      }
    }

    // 页面初始化 options为页面跳转所带来的参数
    if (options.grouponId) {
      //这个pageId的值存在则证明首页的开启来源于用户点击来首页,同时可以通过获取到的pageId的值跳转导航到对应的详情页
      wx.navigateTo({
        url: '../goods/goods?grouponId=' + options.grouponId
      });
    }

    // 页面初始化 options为页面跳转所带来的参数
    if (options.goodId) {
      //这个pageId的值存在则证明首页的开启来源于用户点击来首页,同时可以通过获取到的pageId的值跳转导航到对应的详情页
      wx.navigateTo({
        url: '../goods/goods?id=' + options.goodId
      });
    }

    // 页面初始化 options为页面跳转所带来的参数
    if (options.orderId) {
      //这个pageId的值存在则证明首页的开启来源于用户点击来首页,同时可以通过获取到的pageId的值跳转导航到对应的详情页
      wx.navigateTo({
        url: '../ucenter/orderDetail/orderDetail?id=' + options.orderId
      });
    }

    //代理商的父级地级市id  用于商品筛选展示 不同地级市展示不同商品
    //this.getIndexData();
    
  },

  //小程序开门关门时间
  openLiPro:function(){
    //获取当前时间  
    var date = new Date();
    var now = date.getTime();
    
    //设置截止时间  
    var str = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " 22:00:00";
    var endDate = new Date(str);
    var end = endDate.getTime();

    //设置开店时间  
    var bstr = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " 08:00:00";
    var beginDate = new Date(bstr);
    var begin = beginDate.getTime();

    //关店时间差  
    var leftTime = end - now;
    //开店时间差
    var rightTime = begin - now;

    //定义变量 h,m,s保存倒计时的时间  
    let h, m, s;
    if (leftTime >= 0) {
      h = Math.floor(leftTime / 1000 / 60 / 60 % 24);
      m = Math.floor(leftTime / 1000 / 60 % 60);
      s = Math.floor(leftTime / 1000 % 60);
      //倒计时关店
      var openWxTimer = new timer({
        beginTime: "0" + h + ":" + m + ":" + s,
        //beginTime: "00:00:10",
        name: 'openWxTimer',
        complete: function () {
          console.log("关闭完成了")
          // 关闭所有页面，打开到应用内的某个页面。
          wx.reLaunch({
            url: '/pages/close/close'
          })
        }
      })
      openWxTimer.start(this);
    }

    if(rightTime>0){
      h = Math.floor(rightTime / 1000 / 60 / 60 % 24);
      m = Math.floor(rightTime / 1000 / 60 % 60);
      s = Math.floor(rightTime / 1000 % 60);
      //倒计时开店
      var closeWxTimer = new timer({
        beginTime: "0" + h + ":" + m + ":" + s,
        //beginTime: "00:00:10",
        name: 'closeWxTimer',
        complete: function () {
          console.log("开始完成了")
          wx.reLaunch({
            url: '/pages/index/index?regionid=' + app.globalData.regionid + '&parentregionid=' + app.globalData.parentregionid
          })
        }
      })
      closeWxTimer.start(this);
    }
  },  

  onReady: function() {
    // 页面渲染完成
  },
  onShow: function() {
    // 页面显示
    let that = this;
    var angentInfo = wx.getStorageSync('angentInfo');
    var agentFans = wx.getStorageSync('agentFans');
    var regionInfo = wx.getStorageSync('regionInfo');
    if (app.globalData.parentregionid > 0){
      that.setData({
        regionid: app.globalData.regionid,
        parentregionid: app.globalData.parentregionid,
        address: regionInfo.name,
        angentInfo: angentInfo,
        agentFans: agentFans
      });
    }else{
      if (angentInfo.regionId>0) {
        that.setData({
          regionid: angentInfo.regionId,
          parentregionid: angentInfo.pRegId,
          address: regionInfo.name,
          angentInfo: angentInfo,
          agentFans: agentFans
        });
      } else {
        that.setData({
          regionid: 0,
          parentregionid: 0,
          address: '',
          angentInfo:'',
          agentFans:0
        });
      }
    }
    
    that.getIndexData();
  },
  onHide: function() {
    // 页面隐藏
  },
  onUnload: function() {
    // 页面关闭
  },
});