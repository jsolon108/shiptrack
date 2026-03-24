export const msalConfig = {
  auth: {
    clientId: "8a95e276-4c5f-4d6c-8849-bcd9d5cd77ef",
    authority: "https://login.microsoftonline.com/1f7a063a-475c-4fd4-8e4a-481818a79ce8",
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

export const EDITOR_GROUP_ID = "7a291b99-ed98-4373-bf1a-e21ff8dce301";
export const VIEWER_GROUP_ID = "627202f2-8b20-470a-907a-4913fe103df4";