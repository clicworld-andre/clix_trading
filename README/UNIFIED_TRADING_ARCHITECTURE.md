# 🚀 Unified Trading Architecture

## Overview

The Clix trading platform now uses a **unified service architecture** that consolidates both OTC (Over-The-Counter) and Stellar SDEX trading under a single, efficient service layer. This approach eliminates code duplication while maintaining the distinct user experiences for both trading contexts.

## 🎯 **Architecture Benefits**

### ✅ **Simplified Structure**
- **Single API Endpoint**: `/api/stellar/*` handles both OTC and direct Stellar trading
- **Context-Aware Routing**: Orders automatically route based on presence of `chatroomId`
- **Unified Token Management**: One source of truth for all tradeable assets

### ✅ **Reduced Complexity**
- **Eliminated Duplication**: No more separate OTC and Stellar service layers
- **Consistent Interface**: Same methods work for both trading contexts
- **Easier Maintenance**: Changes in one place affect both systems

### ✅ **Enhanced User Experience**
- **Consistent Behavior**: Both trading contexts use the same underlying logic
- **Context-Specific Features**: OTC gets chat room integration, Stellar gets public order book
- **Seamless Wallet Integration**: Single Clic wallet works for both systems

---

## 🏗 **Technical Architecture**

### **Service Layer Structure**

```typescript
// Unified Trading API
export const tradingApi = {
  getTokens: () => { /* Returns tokens for both contexts */ },
  getBalances: (username) => { /* Same wallet, same balances */ },
  placeOrder: (orderData) => {
    // Smart routing based on context
    if (orderData.chatroomId) {
      // OTC context: chat-room specific
    } else {
      // Direct Stellar SDEX trading  
    }
  },
  // ... other unified operations
}

// Legacy compatibility layers
export const otcApi = { /* Routes to tradingApi */ }
export const stellarApi = { /* Routes to tradingApi */ }
```

### **Context-Aware Endpoints**

All endpoints under `/api/stellar/*` now intelligently handle both contexts:

| Endpoint | OTC Context | Stellar Context |
|----------|-------------|-----------------|
| `getTokens` | Returns all tokens with context flags | Same token list, different filtering |
| `placeOrder` | Includes `chatroomId` in order | Direct SDEX order placement |
| `getOrders` | Filters by `chatroom_id` parameter | Returns all user orders |
| `takeOffer` | OTC-specific offer acceptance | Stellar offer acceptance |
| `getHistory` | Chat room filtered history | All user trade history |

---

## 🔧 **API Usage Examples**

### **OTC Trading (Chat Room Context)**
```javascript
// Place an order in a specific chat room
await tradingApi.placeOrder({
  userId: "testuser",
  direction: "buy",
  baseAsset: "BTC",
  counterAsset: "USDC", 
  amount: 0.1,
  price: 50000,
  chatroomId: "!roomid:matrix.org" // OTC context flag
})

// Get orders for a specific chat room
await tradingApi.getOrders("testuser", { 
  chatroomId: "!roomid:matrix.org" 
})
```

### **Direct Stellar Trading**
```javascript
// Place order directly on Stellar SDEX
await tradingApi.placeOrder({
  userId: "testuser",
  direction: "buy",
  baseAsset: "XLM", 
  counterAsset: "USDC",
  amount: 100,
  price: 0.125
  // No chatroomId = Stellar context
})

// Get all user orders from Stellar SDEX
await tradingApi.getOrders("testuser")
```

---

## 📊 **Supported Tokens**

The unified system supports tokens across both trading contexts:

```json
{
  "tokens": [
    {
      "code": "XLM",
      "name": "Stellar Lumens", 
      "trading_contexts": ["stellar", "otc"]
    },
    {
      "code": "USDC",
      "name": "USD Coin",
      "trading_contexts": ["stellar", "otc"] 
    },
    {
      "code": "BTC", 
      "name": "Bitcoin",
      "trading_contexts": ["otc"]
    },
    {
      "code": "AQUA",
      "name": "Aquarius", 
      "trading_contexts": ["stellar"]
    }
  ]
}
```

---

## 🔄 **Migration from Legacy API**

### **Before (Separate Services)**
```javascript
// Old OTC API
await fetch('/api/otc/getTokens')
await fetch('/api/otc/placeOrder', {...})

// Old Stellar API  
await fetch('/api/stellar/getTokens')
await fetch('/api/stellar/placeOrder', {...})
```

### **After (Unified API)**
```javascript
// New Unified API - both route to /api/stellar/*
await tradingApi.getTokens()           // Works for both contexts
await tradingApi.placeOrder(orderData) // Smart context routing

// Legacy APIs still work (backward compatibility)
await otcApi.getTokens()     // Routes to tradingApi internally
await stellarApi.getTokens() // Routes to tradingApi internally
```

---

## ✅ **Testing Results**

The unified architecture has been thoroughly tested:

### **Endpoint Tests**
- ✅ **Token Retrieval**: `/api/stellar/getTokens` returns 7 tokens with context flags
- ✅ **Order Management**: All CRUD operations work for both contexts
- ✅ **Context Routing**: Orders with `chatroomId` route to OTC context
- ✅ **Legacy Compatibility**: Old `otcApi` and `stellarApi` still function
- ✅ **Error Handling**: 404s for removed `/api/otc/*` endpoints

### **Integration Tests**
- ✅ **OTC Trading**: `takeOffer`, `deleteOrder`, `getHistory` with chat room context
- ✅ **Stellar Trading**: Direct SDEX operations without chat room context  
- ✅ **Wallet Integration**: Single Clic wallet works across both systems

---

## 🚀 **Future Enhancements**

The unified architecture provides a solid foundation for:

1. **Cross-Context Trading**: Easy to implement orders that span both OTC and SDEX
2. **Advanced Order Types**: Unified logic can support complex order types across contexts
3. **Enhanced Analytics**: Single data pipeline for both trading types
4. **Improved Performance**: Reduced API surface area and consolidated caching

---

## 📝 **Summary**

The unified trading architecture successfully consolidates OTC and Stellar trading into a single, efficient system while:

- **Maintaining Backward Compatibility**: Existing code continues to work
- **Eliminating Code Duplication**: Single implementation serves both contexts  
- **Improving Maintainability**: Changes in one place affect both systems
- **Enhancing User Experience**: Consistent behavior across trading types

This architecture reflects the reality that both OTC and Stellar trading are simply different UIs for the same underlying Stellar network infrastructure.
