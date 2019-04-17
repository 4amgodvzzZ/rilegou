var util = require('./utils/util.js');
var api = require('./config/api.js');
var user = require('./utils/user.js');
var timer = require('./utils/sdk/wxTimer.js');

App({
  onLaunch: function() {
    const updateManager = wx.getUpdateManager();
    wx.getUpdateManager().onUpdateReady(function() {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: function(res) {
          if (res.confirm) {
            // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
            updateManager.applyUpdate()
          }
        }
      })
    })
  },
  onShow: function(options) {
    user.checkLogin().then(res => {
      this.globalData.hasLogin = true;
    }).catch(() => {
      this.globalData.hasLogin = false;
    });

    //当前时间不是开店时间的话  关闭小程序
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

    //关店时间跟现在时间比较 
    var leftTime = end - now;
    //开店时间跟现在时间比较
    var rightTime = begin - now;

    if(leftTime<0 || rightTime >0){
      wx.reLaunch({
        url: '/pages/close/close'
      })
    }
  },
  globalData: {
    hasLogin: false,
    regionid: 0,//代理点的regionid  用于订单以及门店关联
    parentregionid:0,//代理点上级地级市id  用于商品展示关联
    userid:0,
    userLevel:0 //用户是否为代理商
  },
})