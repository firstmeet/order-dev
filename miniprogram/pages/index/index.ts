// index.ts
// 获取应用实例
import { checkLogin } from '../../utils/auth';
import { API } from '../../config/api';
import { formatDate } from '../../utils/util';

const app = getApp<IAppOption>()
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

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
}

// 定义分页接口
interface Pagination {
  current_page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

Component({
  data: {
    motto: 'Hello World',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    tasks: [] as Task[],
    pagination: {
      current_page: 1,
      page_size: 10,
      total: 0,
      total_pages: 0
    } as Pagination,
    isLoading: false,
    hasMore: true,
    searchKeyword: '',
    searchTimer: null as any,
    
    // 筛选相关
    gameOptions: ['全部', '剑网三','其他'],
    gameIndex: 0,
    statusOptions: ['全部', '招募中', '已关闭'],
    statusIndex: 0,
    
    // 筛选参数
    filterParams: {
      game: '',
      status: ''
    }
  },
  lifetimes: {
    attached() {
      // 在组件实例进入页面节点树时执行
      this.checkLoginStatus();
    },
    ready() {
      // 在组件在视图层布局完成后执行
      this.loadTasks(true);
    }
  },
  pageLifetimes: {
    show() {
      // 页面被展示时执行
      this.checkLoginStatus();
      // 每次显示页面时刷新任务列表
      this.loadTasks(true);
    }
  },
  methods: {
    // 检查登录状态
    checkLoginStatus() {
      // 检查是否已登录，如果未登录则跳转到登录页面
      checkLogin(false);
    },
    // 事件处理函数
    bindViewTap() {
      wx.navigateTo({
        url: '../logs/logs',
      })
    },
    onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail
      const { nickName } = this.data.userInfo
      this.setData({
        "userInfo.avatarUrl": avatarUrl,
        hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
      })
    },
    onInputChange(e: any) {
      const nickName = e.detail.value
      const { avatarUrl } = this.data.userInfo
      this.setData({
        "userInfo.nickName": nickName,
        hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
      })
    },
    getUserProfile() {
      // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
      wx.getUserProfile({
        desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: (res) => {
          console.log(res)
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    },
    
    // 下拉刷新
    onPullDownRefresh() {
      // 重新加载任务列表
      this.loadTasks(true);
    },
    
    // 加载任务列表
    loadTasks(refresh = false) {
      const { current_page, page_size } = this.data.pagination;
      const page = refresh ? 1 : current_page;
      
      // 如果是刷新，重置任务列表
      if (refresh) {
        this.setData({
          tasks: [],
          'pagination.current_page': 1,
          hasMore: true
        });
      }
      
      // 如果没有更多数据，直接返回
      if (!this.data.hasMore && !refresh) {
        return;
      }
      
      // 设置加载状态
      this.setData({
        isLoading: true
      });
      
      // 构建请求参数
      const params: any = {
        page: page,
        page_size: page_size
      };
      
      // 添加筛选参数
      const { game, status } = this.data.filterParams;
      if (game) params.game = game;
      if (status) params.status = status;
      
      // 添加搜索关键词
      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword;
      }
      
      // 发起请求
      wx.request({
        url: API.TASK.LIST,
        method: 'GET',
        data: params,
        success: (res: any) => {
          if (res.data.code === 200) {
            const { tasks, pagination } = res.data.data;
            
            // 格式化日期
            const formattedTasks = tasks.map((task: Task) => {
              return {
                ...task,
                created_at_formatted: formatDate(new Date(task.created_at))
              };
            });
            
            // 更新数据
            this.setData({
              tasks: refresh ? formattedTasks : [...this.data.tasks, ...formattedTasks],
              pagination: pagination,
              hasMore: pagination.current_page < pagination.total_pages
            });
          } else {
            wx.showToast({
              title: res.data.message || '获取任务列表失败',
              icon: 'none'
            });
          }
        },
        fail: () => {
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        },
        complete: () => {
          this.setData({
            isLoading: false
          });
          
          // 停止下拉刷新
          wx.stopPullDownRefresh();
        }
      });
    },
    
    // 加载更多任务
    loadMoreTasks() {
      if (this.data.isLoading || !this.data.hasMore) return;
      
      const nextPage = this.data.pagination.current_page + 1;
      this.setData({
        'pagination.current_page': nextPage
      });
      
      this.loadTasks();
    },
    
    // 游戏筛选变化
    onGameChange(e: any) {
      const index = e.detail.value;
      this.setData({
        gameIndex: index
      });
    },
    
    // 状态筛选变化
    onStatusChange(e: any) {
      const index = e.detail.value;
      this.setData({
        statusIndex: index
      });
    },
    
    // 应用筛选
    applyFilters() {
      const { gameIndex, statusIndex, gameOptions, statusOptions } = this.data;
      
      // 构建筛选参数
      const filterParams = {
        game: gameIndex === 0 ? '' : gameOptions[gameIndex],
        status: statusIndex === 0 ? '' : (statusIndex === 1 ? 'open' : 'closed')
      };
      
      this.setData({
        filterParams: filterParams
      });
      
      // 重新加载任务
      this.loadTasks(true);
    },
    
    // 导航到任务详情页
    navigateToDetail(e: any) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/task-detail/task-detail?id=${id}`
      });
    },
    
    // 导航到发布页面
    navigateToPublish() {
      wx.navigateTo({
        url: '/pages/publish-task/publish-task'
      });
    },
    
    // 预览二维码
    previewQRCode(e: any) {
      const url = e.currentTarget.dataset.url;
      wx.previewImage({
        urls: [url],
        current: url
      });
      
      // 阻止冒泡，防止触发navigateToDetail
      return false;
    },

    // 搜索输入
    onSearchInput(e: any) {
      const value = e.detail.value;
      this.setData({ searchKeyword: value });
      
      // 防抖处理
      if (this.data.searchTimer) {
        clearTimeout(this.data.searchTimer);
      }
      
      this.data.searchTimer = setTimeout(() => {
        this.onSearch();
      }, 500);
    },

    // 执行搜索
    onSearch() {
      this.loadTasks(true);
    }
  },
})
