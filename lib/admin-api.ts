// Base URL for the API
const BASE_URL = "https://api.clicworld.app"

// Function to set the JWT token with persistence
export const setJwtToken = (token: string) => {
  // Store in memory
  localStorage.setItem('admin_jwt_token', token);
}

// Function to get the JWT token from localStorage
export const getJwtToken = () => {
  // First try to get from localStorage (for persistence across page reloads)
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_jwt_token');
  }
  return null;
}

// Function to clear the JWT token (for logout)
export const clearJwtToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_jwt_token');
  }
}

// Function to check if the user is authenticated
export const isAuthenticated = () => {
  return !!getJwtToken();
}

// Function to handle API requests with authentication
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getJwtToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }))
    throw new Error(error.message || `API request failed with status ${response.status}`)
  }

  return response.json()
}

// Admin login function
export const adminLogin = async (username: string, password: string) => {
  const response = await apiRequest("/fedapi/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })

  if (response.jwt) {
    localStorage.setItem('user_data', JSON.stringify(response));
    setJwtToken(response.jwt)
  }

  return response
}

// Function to get all tokens
export const getTokens = async () => {
  return apiRequest("/assets/admin/getTokens?type=security")
}

// Function to add a new token
export const addToken = async (tokenData: {
  token_name: string
  code: string
  asset_type: string
  sis_number: string
  maturity: string
  duration: string
  returns: string
  status: string
  img_url: string
  shares: string
}) => {
  return apiRequest("/assets/admin/addToken", {
    method: "POST",
    body: JSON.stringify(tokenData),
  })
}

// Function to get token details
export const getTokenDetails = async (tokenId: string) => {
  return apiRequest(`/assets/admin/getBondById/${tokenId}`)
}

// Function to update a token
export const updateToken = async (
  tokenId: string,
  tokenData: {
    token_name?: string
    code?: string
    asset_type?: string
    sis_number?: string
    maturity?: string
    duration?: string
    returns?: string
    status?: string
    img_url?: string
    shares?: string
  },
) => {
  return apiRequest(`/assets/admin/updateToken/${tokenId}`, {
    method: "PUT",
    body: JSON.stringify(tokenData),
  })
}

// Function to delete a token
export const deleteToken = async (tokenId: string) => {
  return apiRequest(`/assets/admin/deleteToken/${tokenId}`, {
    method: "DELETE",
  })
}

// Stellar Network API functions
// These functions fetch data from the Stellar Horizon API

// Function to get asset holders from Stellar
export const getStellarAssetHolders = async (assetCode: string, issuerPublicKey: string) => {
  try {
    const response = await fetch(`https://horizon.stellar.org/accounts?asset=${assetCode}:${issuerPublicKey}&limit=100`)
    const data = await response.json()
    return data._embedded?.records || []
  } catch (error) {
    console.error("Error fetching Stellar asset holders:", error)
    throw new Error("Failed to fetch asset holders from Stellar network")
  }
}

// Function to get asset transactions from Stellar
export const getStellarAssetTransactions = async (assetCode: string, issuerPublicKey: string) => {
  try {
    const response = await fetch(
      `https://horizon.stellar.org/transactions?asset=${assetCode}:${issuerPublicKey}&limit=100&order=desc`,
    )
    const data = await response.json()
    return data._embedded?.records || []
  } catch (error) {
    console.error("Error fetching Stellar asset transactions:", error)
    throw new Error("Failed to fetch asset transactions from Stellar network")
  }
}

// Function to get asset trades from Stellar
export const getStellarAssetTrades = async (assetCode: string, issuerPublicKey: string) => {
  try {
    const response = await fetch(
      `https://horizon.stellar.org/trades?base_asset_code=${assetCode}&base_asset_issuer=${issuerPublicKey}&limit=100&order=desc`,
    )
    const data = await response.json()
    return data._embedded?.records || []
  } catch (error) {
    console.error("Error fetching Stellar asset trades:", error)
    throw new Error("Failed to fetch asset trades from Stellar network")
  }
}

// Function to get asset supply from Stellar
export const getStellarAssetSupply = async (assetCode: string, issuerPublicKey: string) => {
  try {
    const response = await fetch(
      `https://horizon.stellar.org/assets?asset_code=${assetCode}&asset_issuer=${issuerPublicKey}`,
    )
    const data = await response.json()
    const asset = data._embedded?.records?.[0]
    return asset?.amount || "0"
  } catch (error) {
    console.error("Error fetching Stellar asset supply:", error)
    throw new Error("Failed to fetch asset supply from Stellar network")
  }
}

// Admin API functions

export async function addBond(bondData: {
  altxName: string;
  issuer: string;
  receiverWalletId: string;
  dateCreated: string;
  issuedShares: number;
  securityType: string;
  isin: string;
  currency: string;
  series: string;
}) {
  try {
    // Call the actual API route
    const response = await fetch('/api/admin/bonds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bondData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add bond');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding bond:', error);
    throw error;
  }
}

export async function getBonds() {
  try {
    // Call the actual API route
    const response = await fetch('/api/admin/bonds');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch bonds');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching bonds:', error);
    throw error;
  }
}

export async function getBondById(id: string) {
  try {
    // Call the actual API route
    const response = await apiRequest(`/assets/admin/getBondById/${id}`);
    return response.data
   } catch (error) {
    console.error(`Error fetching bond ${id}:`, error);
    throw error;
  }
}
