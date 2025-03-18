// Don't call getApp() at the module level
// const app = getApp<IAppOption>();
import { API } from '../config/api';

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
export const isLoggedIn = (): boolean => {
  const app = getApp<IAppOption>();
  // 检查全局数据中是否有登录状态
  if (app && app.globalData && app.globalData.isLoggedIn) {
    return true;
  }
  
  // 检查本地存储中是否有token
  const token = wx.getStorageSync('token');
  return !!token;
};

/**
 * 检查登录状态，如果未登录则跳转到登录页面
 * @param {boolean} redirectOnFailure 是否在未登录时重定向到登录页面
 * @returns {boolean} 是否已登录
 */
export const checkLogin = (redirectOnFailure: boolean = true): boolean => {
  const loggedIn = isLoggedIn();
  
  if (!loggedIn && redirectOnFailure) {
    // 获取当前页面路径
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const url = `/${currentPage.route}`;
    
    // 将页面路径和参数保存到本地存储
    let params = '';
    if (currentPage.options) {
      const optionsArr = [];
      for (const key in currentPage.options) {
        optionsArr.push(`${key}=${currentPage.options[key]}`);
      }
      if (optionsArr.length > 0) {
        params = '?' + optionsArr.join('&');
      }
    }
    
    // 保存完整的返回路径（包含参数）
    const fullPath = url + params;
    wx.setStorageSync('returnPage', fullPath);
    
    // 跳转到登录页面
    wx.navigateTo({
      url: '/pages/login/login'
    });
  }
  
  return loggedIn;
};

/**
 * 验证token是否有效
 * @returns {Promise<boolean>} token是否有效
 */
export const verifyToken = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const app = getApp<IAppOption>();
    const token = wx.getStorageSync('token');
    
    if (!token) {
      if (app && app.globalData) {
        app.globalData.isLoggedIn = false;
      }
      resolve(false);
      return;
    }
    
    wx.request({
      url: API.USER.PROFILE,
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + token
      },
      success: (res: any) => {
        if (res.data.code === 200) {
          // token有效，更新用户信息
          if (app && app.globalData) {
            app.globalData.userInfo = res.data.data;
            app.globalData.token = token;
            app.globalData.isLoggedIn = true;
          }
          resolve(true);
        } else {
          // token无效，清除本地存储
          wx.removeStorageSync('token');
          if (app && app.globalData) {
            app.globalData.isLoggedIn = false;
          }
          resolve(false);
        }
      },
      fail: () => {
        // 请求失败，可能是网络问题，暂时不清除token
        if (app && app.globalData) {
          app.globalData.isLoggedIn = false;
        }
        resolve(false);
      }
    });
  });
};

/**
 * 退出登录
 */
export const logout = (): void => {
  const app = getApp<IAppOption>();
  // 清除本地存储的token和返回页面
  wx.removeStorageSync('token');
  wx.removeStorageSync('returnPage');
  
  // 重置全局数据
  if (app && app.globalData) {
    app.globalData.token = '';
    app.globalData.userInfo = undefined;
    app.globalData.isLoggedIn = false;
  }
  
  // 跳转到登录页面
  wx.navigateTo({
    url: '/pages/login/login'
  });
};

/**
 * 初始化登录状态
 */
export const initLoginStatus = (): Promise<boolean> => {
  return verifyToken();
}; 