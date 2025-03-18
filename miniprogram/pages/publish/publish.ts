import { API } from '../../config/api';

interface PriceSpec {
  spec_name: string;
  price: number;
}

interface GameItem {
  id: number;
  game_id: number;
  name: string;
  description: string;
  status: string;
  checked: boolean;
  prices: PriceSpec[];
}

interface GameServer {
  id: number;
  game_id: number;
  name: string;
  code: string;
  status: string;
}

interface Game {
  id: number;
  name: string;
  description: string;
  icon: string;
  status: string;
  game_items: GameItem[];
  game_servers: GameServer[];
}

interface IPublishData {
  games: Game[];
  selectedGame: Game | null;
  selectedGameIndex: number;
  gameItems: GameItem[];
  selectedGameItems: GameItem[] | null;
  selectedGameItemIds: number[];
  gameServers: GameServer[];
  selectedGameServers: string[];
  description: string;
  descriptionLength: number;
  phone: string;
  qq: string;
  formValid: boolean;
  isLoading: boolean;
  totalPricePerDay: string;
}

Page({
  data: {
    games: [],
    selectedGame: null,
    selectedGameIndex: -1,
    gameItems: [],
    selectedGameItems: null,
    selectedGameItemIds: [] as number[],
    gameServers: [],
    selectedGameServers: [],
    description: '',
    descriptionLength: 0,
    phone: '',
    qq: '',
    formValid: false,
    isLoading: true,
    totalPricePerDay: '0.00'
  } as IPublishData,

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  async onLoad() {
    // 获取用户手机号
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        phone: userInfo.phone || ''
      });
    }

    // 获取游戏列表
    await this.fetchGames();
  },

  onShow() {
    // 隐藏官方tabBar
    wx.hideTabBar({});
  },

  onHide() {
    // 显示官方tabBar
    wx.showTabBar({});
  },

  // 获取游戏列表
  async fetchGames() {
    try {
      const token = wx.getStorageSync('token');
      const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: API.GAMES.LIST,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            status: 'active'
          },
          success: (result) => {
            console.log('游戏列表接口返回:', result);
            resolve(result);
          },
          fail: (error) => {
            console.error('游戏列表接口错误:', error);
            reject(error);
          }
        });
      });

      console.log('处理接口返回:', res);
      
      const responseData = res.data as {
        code: number;
        data: Game[];
        message: string;
      };

      // 业务状态码 200 为正常
      if (res.statusCode === 200 && responseData.code === 200) {
        if (Array.isArray(responseData.data)) {
          this.setData({
            games: responseData.data,
            isLoading: false
          });
          console.log('设置游戏列表成功:', this.data.games);
        } else {
          console.error('返回数据格式错误:', responseData);
          throw new Error('返回数据格式错误');
        }
      } else {
        console.error('接口返回错误:', {
          statusCode: res.statusCode,
          responseData: responseData
        });
        throw new Error(responseData.message || '获取游戏列表失败');
      }
    } catch (error) {
      console.error('获取游戏列表失败:', error);
      wx.showToast({
        title: '获取游戏列表失败',
        icon: 'error'
      });
    } finally {
      this.setData({
        isLoading: false
      });
    }
  },

  // 处理游戏选择
  handleGameSelect(e: WechatMiniprogram.CustomEvent) {
    const index = Number(e.detail.value);
    const game = this.data.games[index];
    
    // 为每个游戏项目添加 checked 字段和空的价格规格数组
    const gameItems = game.game_items.map(item => ({
      ...item,
      checked: false,
      prices: []
    }));

    this.setData({
      selectedGame: game,
      selectedGameIndex: index,
      gameItems,
      gameServers: game.game_servers,
      selectedGameItems: null,
      selectedGameItemIds: [],
      selectedGameServers: []
    });
    this.validateForm();
  },

  // 处理游戏项目选择
  handleGameItemSelect(e: WechatMiniprogram.CustomEvent) {
    console.log('选中的值:', e.detail.value);
    const selectedIds = e.detail.value.map(Number);
    console.log('转换后的ID:', selectedIds);
    
    // 更新所有项目的选中状态，同时保留价格规格
    const gameItems = this.data.gameItems.map(item => ({
      ...item,
      checked: selectedIds.includes(item.id),
      // 保留原有的价格规格
      prices: item.prices || []
    }));

    if (selectedIds.length === 0) {
      this.setData({
        gameItems,
        selectedGameItems: null,
        selectedGameItemIds: []
      });
      this.validateForm();
      return;
    }

    // 获取之前已选中项目的价格信息
    const previousPrices = new Map<number, PriceSpec[]>();
    if (this.data.selectedGameItems) {
      this.data.selectedGameItems.forEach((item: GameItem) => {
        if (selectedIds.includes(item.id)) {
          previousPrices.set(item.id, item.prices);
        }
      });
    }

    // 保留已选中项目的价格
    const selectedItems = selectedIds
      .map((id: number) => {
        const item = gameItems.find(item => item.id === id);
        if (!item) return null;
        return {
          ...item,
          // 优先使用已有的价格规格，如果没有则使用空数组
          prices: previousPrices.get(id) || item.prices || []
        };
      })
      .filter((item: GameItem | null): item is GameItem => item !== null);

    console.log('选中的项目:', selectedItems);
    
    this.setData({
      gameItems,
      selectedGameItems: selectedItems,
      selectedGameItemIds: selectedIds
    }, () => {
      console.log('设置后的状态:', {
        selectedGameItems: this.data.selectedGameItems,
        prices: this.data.selectedGameItems && this.data.selectedGameItems[0] ? this.data.selectedGameItems[0].prices : undefined
      });
    });
    
    this.validateForm();
  },

  // 处理服务器选择
  handleServerSelect(e: WechatMiniprogram.CustomEvent) {
    const selectedServers = e.detail.value;
    this.setData({
      selectedGameServers: selectedServers
    });
    this.validateForm();
  },

  // 处理描述输入
  handleDescriptionInput(e: WechatMiniprogram.CustomEvent) {
    const description = e.detail.value;
    this.setData({
      description,
      descriptionLength: description.length
    });
    this.validateForm();
  },

  // 处理QQ输入
  handleQQInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({
      qq: e.detail.value
    });
  },

  // 处理手机号输入
  handlePhoneInput(e: WechatMiniprogram.CustomEvent) {
    const phone = e.detail.value;
    this.setData({
      phone
    });
    this.validateForm();
  },

  // 处理项目价格输入
  handleItemPriceInput(e: WechatMiniprogram.CustomEvent) {
    const { value } = e.detail;
    const { itemId, priceIndex } = e.currentTarget.dataset;
    const itemIndex = this.data.selectedGameItems ? this.data.selectedGameItems.findIndex(item => item.id === Number(itemId)) : -1;
    
    if (itemIndex === -1) return;
    
    // 限制只能输入数字和小数点，且最多两位小数
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      // 更新 selectedGameItems
      const selectedGameItems = [...(this.data.selectedGameItems || [])];
      selectedGameItems[itemIndex].prices[Number(priceIndex)].price = parseFloat(value) || 0;
      
      // 更新 gameItems
      const gameItems = [...this.data.gameItems];
      const gameItemIndex = gameItems.findIndex(item => item.id === Number(itemId));
      if (gameItemIndex !== -1) {
        gameItems[gameItemIndex] = {
          ...gameItems[gameItemIndex],
          prices: selectedGameItems[itemIndex].prices
        };
      }
      
      this.setData({ 
        selectedGameItems,
        gameItems
      });
      this.validateForm();
    }
  },

  // 处理规格名称输入
  handleSpecNameInput(e: WechatMiniprogram.CustomEvent) {
    const { value } = e.detail;
    const { itemId, priceIndex } = e.currentTarget.dataset;
    const itemIndex = this.data.selectedGameItems ? this.data.selectedGameItems.findIndex(item => item.id === Number(itemId)) : -1;
    
    if (itemIndex === -1) return;

    // 更新 selectedGameItems
    const selectedGameItems = [...(this.data.selectedGameItems || [])];
    selectedGameItems[itemIndex].prices[Number(priceIndex)].spec_name = value;
    
    // 更新 gameItems
    const gameItems = [...this.data.gameItems];
    const gameItemIndex = gameItems.findIndex(item => item.id === Number(itemId));
    if (gameItemIndex !== -1) {
      gameItems[gameItemIndex] = {
        ...gameItems[gameItemIndex],
        prices: selectedGameItems[itemIndex].prices
      };
    }
    
    this.setData({ 
      selectedGameItems,
      gameItems
    });
    this.validateForm();
  },

  // 计算总价
  calculateTotalPrice() {
    if (!this.data.selectedGameItems || this.data.selectedGameItems.length === 0) {
      this.setData({ totalPricePerDay: '0.00' });
      return;
    }

    const total = this.data.selectedGameItems.reduce((sum, item) => {
      // 确保价格是有效的数字
      const priceStr = item.prices.reduce((sum, p) => sum + p.price, 0).toFixed(2);
      if (!priceStr || !/^\d+(\.\d{0,2})?$/.test(priceStr)) {
        return sum;
      }
      return sum + parseFloat(priceStr);
    }, 0);

    this.setData({
      totalPricePerDay: total.toFixed(2)
    });
  },

  // 获取特定游戏项目的价格
  getItemPrice(id: number): string {
    const item = this.data.selectedGameItems ? this.data.selectedGameItems.find(item => item.id === id) : undefined;
    return item ? item.prices.reduce((sum, p) => sum + p.price, 0).toFixed(2) : '0.00';
  },

  // 表单验证
  validateForm() {
    const { selectedGame, selectedGameItems, description, phone } = this.data;
    const formValid = selectedGame !== null 
      && selectedGameItems !== null 
      && selectedGameItems.length > 0
      && selectedGameItems.every(item => 
        item.prices.some(p => p.price > 0)
      )
      && description.trim().length >= 10 
      && /^1\d{10}$/.test(phone);

    this.setData({ formValid });
  },

  // 提交表单
  async handleSubmit() {
    if (!this.data.formValid) return;

    const { selectedGame, selectedGameItems, selectedGameServers, description, phone } = this.data;
    
    wx.showLoading({ title: '正在发布', mask: true });

    try {
      const token = wx.getStorageSync('token');
      const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: API.TASK.CREATE,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            game_id: selectedGame?.id,
            desc: description,
            contact: {
              phone
            },
            game_servers: selectedGameServers.length > 0 ? selectedGameServers : undefined,
            items: selectedGameItems ? selectedGameItems.map(item => ({
              game_item_id: item.id,
              prices: item.prices.filter(p => p.price > 0)
            })) : []
          },
          success: (result) => {
            console.log('代练单创建接口返回:', result);
            resolve(result);
          },
          fail: (error) => {
            console.error('代练单创建接口错误:', error);
            reject(error);
          }
        });
      });

      const responseData = res.data as {
        code: number;
        data: any;
        message: string;
      };

      if (res.statusCode === 200 && responseData.code === 200) {
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        });
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        console.error('发布失败:', responseData);
        throw new Error(responseData.message || '发布失败');
      }
    } catch (error) {
      console.error('发布失败:', error);
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除价格规格
  handleDeletePriceSpec(e: WechatMiniprogram.CustomEvent) {
    const { itemId, priceIndex } = e.currentTarget.dataset;
    const itemIndex = this.data.selectedGameItems ? this.data.selectedGameItems.findIndex(item => item.id === Number(itemId)) : -1;
    
    if (itemIndex === -1) return;

    // 更新 selectedGameItems
    const selectedGameItems = [...(this.data.selectedGameItems || [])];
    selectedGameItems[itemIndex].prices.splice(Number(priceIndex), 1);
    
    // 更新 gameItems
    const gameItems = [...this.data.gameItems];
    const gameItemIndex = gameItems.findIndex(item => item.id === Number(itemId));
    if (gameItemIndex !== -1) {
      gameItems[gameItemIndex] = {
        ...gameItems[gameItemIndex],
        prices: selectedGameItems[itemIndex].prices
      };
    }
    
    console.log('删除后的价格规格:', selectedGameItems[itemIndex].prices);
    this.setData({ 
      selectedGameItems,
      gameItems
    }, () => {
      console.log('更新后的状态:', {
        selectedGameItems: this.data.selectedGameItems,
        gameItems: this.data.gameItems
      });
    });
    this.validateForm();
  },

  // 添加价格规格
  handleAddPriceSpec(e: WechatMiniprogram.CustomEvent) {
    const { itemId } = e.currentTarget.dataset;
    const itemIndex = this.data.selectedGameItems ? this.data.selectedGameItems.findIndex(item => item.id === Number(itemId)) : -1;
    
    if (itemIndex === -1) return;

    // 更新 selectedGameItems
    const selectedGameItems = [...(this.data.selectedGameItems || [])];
    selectedGameItems[itemIndex].prices.push({
      spec_name: '',
      price: 0
    });

    // 更新 gameItems
    const gameItems = [...this.data.gameItems];
    const gameItemIndex = gameItems.findIndex(item => item.id === Number(itemId));
    if (gameItemIndex !== -1) {
      gameItems[gameItemIndex] = {
        ...gameItems[gameItemIndex],
        prices: selectedGameItems[itemIndex].prices
      };
    }
    
    console.log('添加后的价格规格:', selectedGameItems[itemIndex].prices);
    this.setData({ 
      selectedGameItems,
      gameItems
    }, () => {
      console.log('更新后的状态:', {
        selectedGameItems: this.data.selectedGameItems,
        gameItems: this.data.gameItems
      });
    });
    this.validateForm();
  }
}); 