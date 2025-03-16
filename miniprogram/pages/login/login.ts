// login.ts
import { API } from '../../config/api';

const app = getApp<IAppOption>();

// 扩展用户信息类型
interface UserInfo extends WechatMiniprogram.UserInfo {
  phone?: string;
  is_new_user?: boolean;
  id?: number;
  username?: string;
}

Page({
  data: {
    canIUseGetUserProfile: false,
    isLoggedIn: false,
    hasPhoneNumber: false,
    showPhoneButton: false // 控制是否显示获取手机号按钮
  },
  
  onLoad() {
    // 检查是否支持getUserProfile API
    this.setData({
      canIUseGetUserProfile: typeof wx.getUserProfile === 'function'
    });
  },
  
  onShow() {
    // 检查登录状态和手机号状态
    this.checkLoginAndPhoneStatus();
  },
  
  // 检查登录状态和手机号状态
  checkLoginAndPhoneStatus() {
    const token = wx.getStorageSync('token');
    const isLoggedIn = !!token;
    
    // 如果已登录，检查是否已有手机号
    let hasPhoneNumber = false;
    if (isLoggedIn && app.globalData.userInfo && (app.globalData.userInfo as UserInfo).phone) {
      hasPhoneNumber = true;
    }
    
    this.setData({
      isLoggedIn,
      hasPhoneNumber
    });
    
    // 如果已登录且已有手机号，直接返回之前的页面
    if (isLoggedIn && hasPhoneNumber) {
      // 延迟一下，确保界面已更新
      setTimeout(() => {
        this.navigateBack();
      }, 100);
    } 
    // 如果已登录但没有手机号，自动触发获取手机号
    else if (isLoggedIn && !hasPhoneNumber) {
      this.triggerGetPhoneNumber();
    }
  },
  
  // 触发获取手机号按钮点击
  triggerGetPhoneNumber() {
    wx.showModal({
      title: '授权提示',
      content: '为了提供更好的服务，需要获取您的手机号',
      confirmText: '立即授权',
      cancelText: '暂不授权',
      success: (res) => {
        if (res.confirm) {
          // 用户点击确认，显示获取手机号按钮
          this.setData({
            showPhoneButton: true
          });
          
          // 提示用户点击获取手机号按钮
          wx.showToast({
            title: '请点击"获取手机号"按钮',
            icon: 'none',
            duration: 2000
          });
        } else {
          // 用户拒绝，仍然返回首页
          this.navigateBack();
        }
      }
    });
  },
  
  // 使用微信授权登录
  handleWechatLogin() {
    if (this.data.canIUseGetUserProfile) {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (userInfo) => {
          this.loginWithWechat(userInfo.userInfo);
        },
        fail: () => {
          wx.showToast({
            title: '授权失败',
            icon: 'none'
          });
        }
      });
    } else {
      // 兼容旧版本
      wx.getUserInfo({
        success: (res) => {
          this.loginWithWechat(res.userInfo);
        },
        fail: () => {
          wx.showToast({
            title: '授权失败',
            icon: 'none'
          });
        }
      });
    }
  },
  
  loginWithWechat(userInfo: WechatMiniprogram.UserInfo) {
    // 显示加载中
    wx.showLoading({
      title: '登录中...',
    });
    
    // 获取微信登录code
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送code到后端换取token
          wx.request({
            url: API.USER.WECHAT_LOGIN,
            method: 'POST',
            data: {
              code: res.code,
              nickname: userInfo.nickName,
              avatar: userInfo.avatarUrl
            },
            success: (loginRes: any) => {
              wx.hideLoading();
              if (loginRes.data.code === 200) {
                // 登录成功，保存token和用户信息
                const token = loginRes.data.data.token;
                const userData = loginRes.data.data as UserInfo;
                wx.setStorageSync('token', token);
                app.globalData.token = token;
                app.globalData.userInfo = userData;
                app.globalData.isLoggedIn = true;
                console.log(app.globalData.userInfo);
                
                // 更新登录状态
                this.setData({
                  isLoggedIn: true,
                  hasPhoneNumber: !!userData.phone,
                  isNewUser: !!userData.is_new_user,
                  userInfo: userData
                });
                
                // 如果已有手机号，直接返回之前的页面
                if (userData.phone) {
                  this.navigateBack();
                } else {
                  // 没有手机号，自动触发获取手机号流程
                  this.triggerGetPhoneNumber();
                }
              } else {
                wx.showToast({
                  title: loginRes.data.message || '登录失败',
                  icon: 'none'
                });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
              });
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '获取微信授权失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '微信登录失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 获取手机号
  getPhoneNumber(e: any) {
    // 隐藏获取手机号按钮
    this.setData({
      showPhoneButton: false
    });
    
    // 用户拒绝授权
    if (!e.detail.code) {
      wx.showToast({
        title: '获取手机号失败，请重试',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载中
    wx.showLoading({
      title: '获取手机号中...',
    });
    
    // 获取token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.hideLoading();
      wx.showToast({
        title: '登录状态已失效，请重新登录',
        icon: 'none'
      });
      return;
    }
    
    // 发送code到后端获取手机号
    wx.request({
      url: API.USER.UPDATE_PHONE,
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        code: e.detail.code
      },
      success: (res: any) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          // 获取手机号成功
          const userData = res.data.data;
          const phone = userData.phone;
          
          // 更新全局用户信息
          if (app.globalData.userInfo) {
            (app.globalData.userInfo as UserInfo).phone = phone;
            
            // 更新其他可能返回的用户信息
            if (userData.username) {
              (app.globalData.userInfo as any).username = userData.username;
            }
            if (userData.id) {
              (app.globalData.userInfo as any).id = userData.id;
            }
          }
          
          // 更新状态
          this.setData({
            hasPhoneNumber: true
          });
          
          // 显示成功提示并立即跳转
          wx.showToast({
            title: '手机号授权成功',
            icon: 'success',
            mask: true, // 使用mask防止用户触摸
            duration: 1000 // 缩短提示时间
          });
          
          // 立即跳转，不需要等待
          this.navigateBack();
        } else {
          wx.showToast({
            title: res.data.message || '获取手机号失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 返回之前的页面或首页
  navigateBack() {
    // 获取保存的返回页面路径
    const returnPage = wx.getStorageSync('returnPage');
    
    if (returnPage) {
      // 清除存储的返回页面
      wx.removeStorageSync('returnPage');
      
      // 尝试使用redirectTo跳转
      wx.redirectTo({
        url: returnPage,
        fail: (err) => {
          console.error('redirectTo失败:', err);
          // 如果重定向失败，尝试使用navigateTo
          wx.navigateTo({
            url: returnPage,
            fail: (err2) => {
              console.error('navigateTo失败:', err2);
              // 如果导航也失败，则尝试使用reLaunch
              wx.reLaunch({
                url: '/pages/index/index',
                fail: (err3) => {
                  console.error('reLaunch失败:', err3);
                  // 最后尝试使用switchTab
                  wx.switchTab({
                    url: '/pages/index/index',
                    fail: (err4) => {
                      console.error('switchTab失败:', err4);
                      // 显示错误提示
                      wx.showToast({
                        title: '页面跳转失败',
                        icon: 'none'
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    } else {
      // 如果没有返回页面，则尝试多种方式跳转到首页
      wx.redirectTo({
        url: '/pages/index/index',
        fail: () => {
          wx.navigateTo({
            url: '/pages/index/index',
            fail: () => {
              wx.reLaunch({
                url: '/pages/index/index',
                fail: () => {
                  wx.switchTab({
                    url: '/pages/index/index',
                    fail: () => {
                      wx.showToast({
                        title: '无法跳转到首页',
                        icon: 'none'
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  }
}); 