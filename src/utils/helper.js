// 将文件数组转为键值对形式
export const flattenArr = (arr) => {
  return arr.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {});
};

// 将键值对转为数组
export const objToArr = (obj) => {
  return Object.keys(obj).map((key) => obj[key]);
};

// 右键出现菜单时有可能点击的是子元素，这时就要上浮到父节点
export const getParentNode = (node, parentClassName) => {
  let current = node;
  while (current !== null) {
    if (current.classList.contains(parentClassName)) {
      return current;
    }
    current = current.parentNode;
  }
  return false;
};

export const timestampToString = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};
