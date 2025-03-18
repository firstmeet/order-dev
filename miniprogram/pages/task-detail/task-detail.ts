// pages/task-detail/task-detail.ts
import { API } from '../../config/api';
import { formatDate } from '../../utils/util';
import { checkLogin } from '../../utils/auth';

// 定义价格规格接口
interface PriceSpec {
  id: number;
  game_id: number;
  game_item_id: number;
  task_item_id: number;
  name: string;
  spec_name: string;
  price: number;
  status: string;
  code: string;
  created_at: string;
}

// 定义任务项接口
interface TaskItem {
  id: number;
  task_type: string;
  price_per_day: number;
  price_specs: PriceSpec[];
}

// 定义任务接口
interface Task {
  id: number;
  user_id: number;
  game: string;
  status: string;
  qr_code_url: string;
  created_at: string;
  created_at_formatted?: string; // 格式化后的日期
  items: TaskItem[];
  desc: string;
  contact: {
    phone: string;
  };
  game_servers?: string[];
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    taskId: 0,
    task: null as Task | null,
    isLoading: true,
    error: '',
    currentTab: '' // 当前选中的标签页，设为空字符串，不选中任何标签
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查登录状态
    checkLogin();
    
    // 获取任务ID
    const { id } = options;
    if (!id) {
      this.setData({
        error: '任务ID不能为空',
        isLoading: false
      });
      return;
    }
    
    this.setData({ taskId: Number(id) });
    this.loadTaskDetail();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 隐藏官方的tabBar
    wx.hideTabBar({});
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 恢复官方的tabBar
    wx.showTabBar({});
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 恢复官方的tabBar
    wx.showTabBar({});
  },

  /**
   * 返回上一页
   */
  navigateBack() {
    wx.navigateBack();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadTaskDetail();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 加载任务详情
   */
  loadTaskDetail() {
    const { taskId } = this.data;
    
    this.setData({ isLoading: true, error: '' });
    
    wx.request({
      url: `${API.TASK.DETAIL}${taskId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res: any) => {
        if (res.data.code === 200) {
          const task = res.data.data;
          
          // 格式化日期
          task.created_at_formatted = formatDate(new Date(task.created_at));
          
          this.setData({
            task,
            isLoading: false
          });
        } else {
          this.setData({
            error: res.data.message || '获取任务详情失败',
            isLoading: false
          });
        }
      },
      fail: () => {
        this.setData({
          error: '网络错误，请重试',
          isLoading: false
        });
      }
    });
  },

  /**
   * 联系发布者
   */
  contactPublisher() {
    const { task } = this.data;
    if (!task || !task.contact || !task.contact.phone) {
      wx.showToast({
        title: '联系方式不可用',
        icon: 'none'
      });
      return;
    }
    
    wx.makePhoneCall({
      phoneNumber: task.contact.phone,
      fail: () => {
        // 复制到剪贴板
        wx.setClipboardData({
          data: task.contact.phone,
          success: () => {
            wx.showToast({
              title: '已复制联系方式',
              icon: 'success'
            });
          }
        });
      }
    });
  },

  /**
   * 接单
   */
  takeOrder() {
    const { taskId } = this.data;
    
    // 导航到下单页面
    wx.navigateTo({
      url: `/pages/create-order/create-order?id=${taskId}`
    });
  },

  /**
   * 预览二维码
   */
  previewQRCode() {
    const { task } = this.data;
    if (!task || !task.qr_code_url) {
      wx.showToast({
        title: '二维码不可用',
        icon: 'none'
      });
      return;
    }
    
    wx.previewImage({
      urls: [task.qr_code_url],
      current: task.qr_code_url
    });
  },
})