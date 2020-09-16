import { useEffect, useRef } from "react";
const { remote } = window.require("electron");
const { Menu, MenuItem } = remote;

const useContextMenu = (itemArr, targetSelector, deps) => {
  // 使用useRef在多次effect中保持引用
  let clickedElement = useRef(null);
  useEffect(() => {
    const menu = new Menu();
    itemArr.forEach((item) => {
      menu.append(new MenuItem(item));
    });
    const handleContextMenu = (e) => {
      // targetSelector是区域，只有在规定区域里点击右键才出现菜单
      if (document.querySelector(targetSelector).contains(e.target)) {
        clickedElement.current = e.target;
        menu.popup({ window: remote.getCurrentWindow() });
      }
    };
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, deps);

  // 返回拿到的dom元素
  return clickedElement;
};

export default useContextMenu;
