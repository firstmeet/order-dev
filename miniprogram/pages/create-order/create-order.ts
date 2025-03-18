// pages/create-order/create-order.ts
import { API } from '../../config/api';
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
  game_item_id: number;
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

// 定义游戏服务器接口
interface GameServer {
  id: number;
  game_id: number;
  name: string;
  code: string;
  status: string;
}

// 定义订单任务项接口
interface OrderTask {
  game_item_id: number;
  price_spec_id: number;
  count: number;
}

// 定义账号详情接口
interface AccountDetail {
  game_account: string;
  game_password: string;
  character_name: string;
  game_server_id?: number;
  selectedServer: GameServer | null;
  selectedServerIndex: number;
  selectedTasks: {[itemId: string]: {specId: number, count: number}};
}

// 定义游戏接口
interface Game {
  id: number;
  name: string;
  description: string;
  icon: string;
  status: string;
  game_items: unknown[];
  game_servers: GameServer[];
}

// 定义API响应接口
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

Page({
  data: {
    taskId: 0,
    task: null as Task | null,
    gameServers: [] as GameServer[],
    accountDetails: [] as AccountDetail[],
    totalPrice: '0.00',
    formValid: false,
    isLoading: true,
  },

  onLoad(options) {
    // 检查登录状态
    checkLogin();
    
    // 获取任务ID
    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '任务ID不能为空',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    // 初始化一个账号
    const initialAccount: AccountDetail = {
      game_account: '',
      game_password: '',
      character_name: '',
      selectedServer: null,
      selectedServerIndex: -1,
      selectedTasks: {}
    };
    
    this.setData({ 
      taskId: Number(id),
      accountDetails: [initialAccount]
    });
    
    this.loadTaskDetail();
    this.loadGameServers();
  },

  onShow() {
    // 隐藏官方的tabBar
    wx.hideTabBar({});
  },

  onHide() {
    // 恢复官方的tabBar
    wx.showTabBar({});
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  // 加载任务详情
  async loadTaskDetail() {
    const { taskId } = this.data;
    
    try {
      const token = wx.getStorageSync('token');
      const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: `${API.TASK.DETAIL}${taskId}`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: (result) => {
            resolve(result);
          },
          fail: (error) => {
            reject(error);
          }
        });
      });

      const responseData = res.data as ApiResponse<Task>;

      if (res.statusCode === 200 && responseData.code === 200) {
        this.setData({
          task: responseData.data,
          isLoading: false
        });
      } else {
        throw new Error(responseData.message || '获取任务详情失败');
      }
    } catch (error) {
      console.error('获取任务详情失败:', error);
      wx.showToast({
        title: '获取任务详情失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        isLoading: false
      });
    }
  },

  // 加载游戏服务器
  async loadGameServers() {
    try {
      const token = wx.getStorageSync('token');
      const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: `${API.GAMES.LIST}`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: (result) => {
            resolve(result);
          },
          fail: (error) => {
            reject(error);
          }
        });
      });

      const responseData = res.data as ApiResponse<Game[]>;

      if (res.statusCode === 200 && responseData.code === 200) {
        // 找到当前任务对应的游戏
        const { task } = this.data;
        if (task) {
          const game = responseData.data.find(g => g.name === task.game);
          if (game && game.game_servers) {
            this.setData({
              gameServers: game.game_servers
            });
          }
        }
      } else {
        throw new Error(responseData.message || '获取游戏服务器失败');
      }
    } catch (error) {
      console.error('获取游戏服务器失败:', error);
    }
  },

  // 添加账号
  addAccount() {
    const { accountDetails } = this.data;
    
    const newAccount: AccountDetail = {
      game_account: '',
      game_password: '',
      character_name: '',
      selectedServer: null,
      selectedServerIndex: -1,
      selectedTasks: {}
    };
    
    this.setData({
      accountDetails: [...accountDetails, newAccount]
    });
    
    this.validateForm();
  },

  // 删除账号
  deleteAccount(e: WechatMiniprogram.CustomEvent) {
    const { index } = e.currentTarget.dataset;
    const { accountDetails } = this.data;
    
    if (accountDetails.length <= 1) {
      return;
    }
    
    const newAccountDetails = [...accountDetails];
    newAccountDetails.splice(index, 1);
    
    this.setData({
      accountDetails: newAccountDetails
    });
    
    this.calculateTotalPrice();
    this.validateForm();
  },

  // 处理账号输入变化
  handleAccountInput(e: WechatMiniprogram.CustomEvent) {
    const { field, index } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    const accountDetails = [...this.data.accountDetails];
    const accountIndex = Number(index);
    
    if (field === 'game_account') {
      accountDetails[accountIndex].game_account = value;
    } else if (field === 'game_password') {
      accountDetails[accountIndex].game_password = value;
    } else if (field === 'character_name') {
      accountDetails[accountIndex].character_name = value;
    }
    
    this.setData({ accountDetails });
    this.validateForm();
  },

  // 处理服务器选择
  handleServerSelect(e: WechatMiniprogram.CustomEvent) {
    const { index } = e.currentTarget.dataset;
    const serverIndex = Number(e.detail.value);
    const server = this.data.gameServers[serverIndex];
    
    const accountDetails = [...this.data.accountDetails];
    accountDetails[index].selectedServer = server;
    accountDetails[index].selectedServerIndex = serverIndex;
    accountDetails[index].game_server_id = server.id;
    
    this.setData({ accountDetails });
    this.validateForm();
  },

  // 选择规格
  selectSpec(e: WechatMiniprogram.CustomEvent) {
    const { accountIndex, itemId, specId } = e.currentTarget.dataset;
    
    console.log('selectSpec', accountIndex, itemId, specId);
    
    const accountDetails = [...this.data.accountDetails];
    const selectedTasks = { ...accountDetails[accountIndex].selectedTasks };
    
    // 如果已经选择了这个规格，则取消选择
    if (selectedTasks[itemId] && selectedTasks[itemId].specId === Number(specId)) {
      delete selectedTasks[itemId];
    } else {
      // 否则选择这个规格，默认数量为1
      selectedTasks[itemId] = { specId: Number(specId), count: 1 };
    }
    
    accountDetails[accountIndex].selectedTasks = selectedTasks;
    
    this.setData({ accountDetails });
    this.calculateTotalPrice();
    this.validateForm();
  },

  // 增加数量
  increaseQuantity(e: WechatMiniprogram.CustomEvent) {
    const { accountIndex, itemId } = e.currentTarget.dataset;
    
    console.log('increaseQuantity', accountIndex, itemId);
    
    const accountDetails = [...this.data.accountDetails];
    const selectedTasks = { ...accountDetails[accountIndex].selectedTasks };
    
    if (selectedTasks[itemId]) {
      selectedTasks[itemId].count += 1;
      accountDetails[accountIndex].selectedTasks = selectedTasks;
      
      this.setData({ accountDetails });
      this.calculateTotalPrice();
      this.validateForm();
    }
  },

  // 减少数量
  decreaseQuantity(e: WechatMiniprogram.CustomEvent) {
    const { accountIndex, itemId } = e.currentTarget.dataset;
    
    console.log('decreaseQuantity', accountIndex, itemId);
    
    const accountDetails = [...this.data.accountDetails];
    const selectedTasks = { ...accountDetails[accountIndex].selectedTasks };
    
    if (selectedTasks[itemId] && selectedTasks[itemId].count > 1) {
      selectedTasks[itemId].count -= 1;
      accountDetails[accountIndex].selectedTasks = selectedTasks;
      
      this.setData({ accountDetails });
      this.calculateTotalPrice();
      this.validateForm();
    }
  },

  // 处理数量输入
  handleQuantityInput(e: WechatMiniprogram.CustomEvent) {
    const { accountIndex, itemId } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    console.log('handleQuantityInput', accountIndex, itemId, value);
    
    const accountDetails = [...this.data.accountDetails];
    const selectedTasks = { ...accountDetails[accountIndex].selectedTasks };
    
    if (selectedTasks[itemId]) {
      // 确保输入的是非负整数
      const quantity = parseInt(value);
      if (!isNaN(quantity) && quantity > 0) {
        selectedTasks[itemId].count = quantity;
        accountDetails[accountIndex].selectedTasks = selectedTasks;
        
        this.setData({ accountDetails });
        this.calculateTotalPrice();
        this.validateForm();
      }
    }
  },

  // 检查规格是否被选中
  isSpecSelected(accountIndex: number, itemId: number, specId: number): boolean {
    const { accountDetails } = this.data;
    console.log('isSpecSelected called', accountIndex, itemId, specId);
    if (!accountDetails[accountIndex]) return false;
    
    const selectedTask = accountDetails[accountIndex].selectedTasks[itemId];
    const result = selectedTask && selectedTask.specId === Number(specId);
    console.log('isSpecSelected result', result);
    return result;
  },

  // 获取特定任务的数量
  getQuantity(accountIndex: number, itemId: number): number {
    const { accountDetails } = this.data;
    if (!accountDetails[accountIndex]) return 0;
    
    const selectedTask = accountDetails[accountIndex].selectedTasks[itemId];
    return selectedTask ? selectedTask.count : 0;
  },

  // 计算总价
  calculateTotalPrice() {
    const { task, accountDetails } = this.data;
    if (!task) return;
    
    let total = 0;
    
    // 遍历所有账号
    accountDetails.forEach(account => {
      // 遍历所有选中的任务
      Object.entries(account.selectedTasks).forEach(([itemId, { specId, count }]) => {
        const item = task.items.find(i => i.game_item_id === Number(itemId));
        if (item) {
          const spec = item.price_specs.find(s => s.id === specId);
          if (spec) {
            total += spec.price * count;
          }
        }
      });
    });
    
    this.setData({
      totalPrice: total.toFixed(2)
    });
  },

  // 表单验证
  validateForm() {
    const { accountDetails } = this.data;
    
    // 检查是否有账号
    if (accountDetails.length === 0) {
      this.setData({ formValid: false });
      return;
    }
    
    // 检查每个账号是否有效
    let allAccountsValid = true;
    let hasSelectedTask = false;
    
    for (const account of accountDetails) {
      // 检查必填字段
      const requiredFieldsValid = account.game_account.trim() !== '' 
        && account.game_password.trim() !== '' 
        && account.character_name.trim() !== '';
      
      if (!requiredFieldsValid) {
        allAccountsValid = false;
        break;
      }
      
      // 检查是否选择了至少一个任务
      if (Object.keys(account.selectedTasks).length > 0) {
        hasSelectedTask = true;
      }
    }
    
    this.setData({
      formValid: allAccountsValid && hasSelectedTask
    });
  },

  // 提交表单
  async handleSubmit() {
    if (!this.data.formValid) return;
    
    const { taskId, accountDetails, task } = this.data;
    
    // 构建请求数据
    const details = accountDetails.map(account => {
      // 构建订单任务列表
      const tasks: OrderTask[] = [];
      
      Object.entries(account.selectedTasks).forEach(([itemId, { specId, count }]) => {
        tasks.push({
          game_item_id: Number(itemId),
          price_spec_id: specId,
          count
        });
      });
      
      return {
        game_account: account.game_account,
        game_password: account.game_password,
        character_name: account.character_name,
        game_server_id: account.game_server_id,
        tasks
      };
    }).filter(detail => detail.tasks.length > 0); // 过滤掉没有选择任务的账号
    
    // 如果没有有效的账号详情，则不提交
    if (details.length === 0) {
      wx.showToast({
        title: '请至少选择一个任务',
        icon: 'none'
      });
      return;
    }
    
    // 显示订单摘要确认
    this.showOrderSummary(details);
  },
  
  // 显示订单摘要确认
  showOrderSummary(details: Array<{
    game_account: string;
    game_password: string;
    character_name: string;
    game_server_id?: number;
    tasks: Array<{
      game_item_id: number;
      price_spec_id: number;
      count: number;
    }>;
  }>) {
    const { task, totalPrice } = this.data;
    if (!task) {
      wx.showToast({
        title: '任务信息不完整',
        icon: 'none'
      });
      return;
    }
    
    // 构建摘要内容
    let content = `订单总价: ¥${totalPrice}\n\n`;
    
    // 添加账号信息
    details.forEach((detail, index) => {
      content += `账号 ${index + 1}: ${detail.game_account}\n`;
      content += `角色: ${detail.character_name}\n`;
      
      // 添加任务信息
      content += '选择的任务:\n';
      detail.tasks.forEach((taskItem) => {
        console.log('处理任务项:', taskItem);
        // 查找任务项和价格规格的名称
        const item = task.items.find(i => i.game_item_id === taskItem.game_item_id);
        console.log('找到的任务项:', item);
        if (item) {
          const spec = item.price_specs.find(s => s.id === taskItem.price_spec_id);
          console.log('找到的价格规格:', spec);
          if (spec) {
            const specName = spec.spec_name || spec.name || '未命名规格';
            content += `- ${item.task_type} (${specName}): ${taskItem.count}个, ¥${(spec.price * taskItem.count).toFixed(2)}\n`;
          } else {
            content += `- ${item.task_type} (规格ID: ${taskItem.price_spec_id}): ${taskItem.count}个\n`;
          }
        } else {
          content += `- 未知任务 (物品ID: ${taskItem.game_item_id}, 规格ID: ${taskItem.price_spec_id}): ${taskItem.count}个\n`;
        }
      });
      
      if (index < details.length - 1) {
        content += '\n';
      }
    });
    
    // 显示确认对话框
    wx.showModal({
      title: '订单确认',
      content: content,
      confirmText: '确认下单',
      cancelText: '返回修改',
      success: (res) => {
        if (res.confirm) {
          this.submitOrder(details);
        }
      }
    });
  },
  
  // 提交订单到服务器
  async submitOrder(details: Array<{
    game_account: string;
    game_password: string;
    character_name: string;
    game_server_id?: number;
    tasks: Array<{
      game_item_id: number;
      price_spec_id: number;
      count: number;
    }>;
  }>) {
    const { taskId } = this.data;
    
    const requestData = {
      task_id: taskId,
      details
    };
    
    wx.showLoading({ title: '正在提交', mask: true });
    
    try {
      const token = wx.getStorageSync('token');
      const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: API.ORDER.CREATE,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: requestData,
          success: (result) => {
            resolve(result);
          },
          fail: (error) => {
            reject(error);
          }
        });
      });
      
      const responseData = res.data as ApiResponse<Record<string, unknown>>;
      
      if (res.statusCode === 200 && responseData.code === 200) {
        wx.showToast({
          title: '下单成功',
          icon: 'success'
        });
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(responseData.message || '下单失败');
      }
    } catch (error) {
      console.error('下单失败:', error);
      wx.showToast({
        title: '下单失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
}); 