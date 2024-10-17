// const loginUserKey = 'Login-User'
const loginUserKey = 'user'

export function getLoginUser() {
  const result = JSON.parse(localStorage.getItem(loginUserKey) || '{}');
  return (result && result.userInfo) || result || {};
}

export function setLoginUser(loginUser) {
  localStorage.setItem(loginUserKey,loginUser);
}

export function removeLoginUser() {
  localStorage.removeItem(loginUserKey);
  localStorage.removeItem('gnList');
}
