const loginUserKey = 'Login-User'

export function getLoginUser() {
  return JSON.parse(localStorage.getItem(loginUserKey) || '{}');
}

export function setLoginUser(loginUser) {
  localStorage.setItem(loginUserKey,loginUser);
}

export function removeLoginUser() {
  localStorage.removeItem(loginUserKey);
  localStorage.removeItem('gnList');
}
