import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import useKeyPress from "../hooks/useKeyPress";
import useContextMenu from "../hooks/useContextMenu";
import { getParentNode } from "../utils/helper";
import fileImg from "../images/markdown.png";
const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
  const [editStatus, setEditStatus] = useState(false);
  const [value, setValue] = useState("");
  let node = useRef(null);
  const enterPressed = useKeyPress(13);
  const escPressed = useKeyPress(27);
  const closeSearch = (editItem) => {
    setEditStatus(false);
    setValue("");
    // if we are editing a newly created file, we should delete this file when pressing esc
    if (editItem.isNew) {
      onFileDelete(editItem.id);
    }
  };

  // useContextMenu抽取成hook
  const clickedItem = useContextMenu(
    [
      {
        label: "打开",
        click: () => {
          // 视频的9-5
          const parentElement = getParentNode(clickedItem.current, "file-item");
          if (parentElement) {
            onFileClick(parentElement.dataset.id);
          }
        },
      },
      {
        label: "重命名",
        click: () => {
          const parentElement = getParentNode(clickedItem.current, "file-item");
          if (parentElement) {
            const { id, title } = parentElement.dataset;
            setEditStatus(id);
            setValue(title);
          }
        },
      },
      {
        label: "删除",
        click: () => {
          const parentElement = getParentNode(clickedItem.current, "file-item");
          if (parentElement) {
            onFileDelete(parentElement.dataset.id);
          }
        },
      },
    ],
    ".file-list",
    [files]
  );

  // 处理按下ESC和Enter
  useEffect(() => {
    // 获取正在进行编辑的文件实例
    const editItem = files.find((file) => file.id === editStatus);

    // 对于空不进行处理
    if (enterPressed && editStatus && value.trim() !== "") {
      // 对于是否是新建的文件有不同的处理方法
      onSaveEdit(editItem.id, value, editItem.isNew);
      setEditStatus(false);
      setValue("");
    }
    if (escPressed && editStatus) {
      closeSearch(editItem);
    }
  });
  useEffect(() => {
    const newFile = files.find((file) => file.isNew);
    if (newFile) {
      setEditStatus(newFile.id);
      setValue(newFile.title);
    }
  }, [files]);
  useEffect(() => {
    if (editStatus) {
      node.current.focus();
    }
  }, [editStatus]);
  return (
    <ul className="list-group list-group-flush file-list">
      {files.map((file) => (
        <li
          className="list-group-item bg-light row d-flex align-items-center file-item mx-0"
          key={file.id}
          data-id={file.id}
          data-title={file.title}
        >
          {file.id !== editStatus && !file.isNew && (
            <>
              <div className="col-2">
                {/* <FontAwesomeIcon size="lg" icon={faMarkdown} /> */}
                <img src={fileImg} className="fileSize" />
              </div>
              <div
                className="col-10 c-link"
                onClick={() => {
                  onFileClick(file.id);
                }}
              >
                {file.title}
              </div>
            </>
          )}
          {(file.id === editStatus || file.isNew) && (
            <>
              <input
                className="form-control col-10"
                ref={node}
                value={value}
                placeholder="请输入文件名称"
                onChange={(e) => {
                  setValue(e.target.value);
                }}
              />
              <button
                type="button"
                className="icon-button col-2"
                onClick={() => {
                  closeSearch(file);
                }}
              >
                <FontAwesomeIcon title="关闭" size="lg" icon={faTimes} />
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
};

FileList.propTypes = {
  files: PropTypes.array,
  onFileClick: PropTypes.func,
  onFileDelete: PropTypes.func,
  onSaveEdit: PropTypes.func,
};
export default FileList;
