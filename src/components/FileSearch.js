import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faTimes } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import useKeyPress from "../hooks/useKeyPress";
import useIpcRenderer from "../hooks/useIpcRenderer";

const FileSearch = ({ title, onFileSearch }) => {
  // 搜索状态，true显示搜索样式
  const [inputActive, setInputActive] = useState(false);
  // 搜索值
  const [value, setValue] = useState("");

  // enter，esc的keyCode
  const enterPressed = useKeyPress(13);
  const escPressed = useKeyPress(27);
  let node = useRef(null);

  // 根据inputActive决定窗口是否开启
  const startSearch = () => {
    setInputActive(true);
  };

  //关闭窗口
  const closeSearch = () => {
    setInputActive(false);
    setValue("");
    // 把FileSearch置空
    onFileSearch(false);
  };
  useIpcRenderer({
    "search-file": startSearch,
  });
  useEffect(() => {
    // 按下回车或者esc后执行搜索函数或者关闭搜索样式
    if (enterPressed && inputActive) {
      onFileSearch(value);
    }
    if (escPressed && inputActive) {
      closeSearch();
    }
  });
  useEffect(() => {
    // 高亮显示
    if (inputActive) {
      node.current.focus();
    }
  }, [inputActive]);
  return (
    <div className="alert alert-primary d-flex justify-content-between align-items-center mb-0">
      {!inputActive && (
        <>
          <span>{title}</span>
          <button type="button" className="icon-button" onClick={startSearch}>
            <FontAwesomeIcon title="搜索" size="lg" icon={faSearch} />
          </button>
        </>
      )}
      {inputActive && (
        <>
          {/* 按下enter执行搜索方法，ref属性是用来标识自己，要进行高亮时可以准确获得实例并调用focus函数 */}
          <input
            className="form-control"
            value={value}
            ref={node}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
          <button type="button" className="icon-button" onClick={closeSearch}>
            <FontAwesomeIcon title="关闭" size="lg" icon={faTimes} />
          </button>
        </>
      )}
    </div>
  );
};

FileSearch.propTypes = {
  title: PropTypes.string,
  onFileSearch: PropTypes.func.isRequired,
};

FileSearch.defaultProps = {
  title: "我的云文档",
};

export default FileSearch;
