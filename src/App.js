import React, { useState } from "react";
import { faPlus, faFileImport } from "@fortawesome/free-solid-svg-icons";
import SimpleMDE from "react-simplemde-editor";
import uuidv4 from "uuid/v4";
import { flattenArr, objToArr, timestampToString } from "./utils/helper";
import fileHelper from "./utils/fileHelper";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "easymde/dist/easymde.min.css";
import FileSearch from "./components/FileSearch";
import FileList from "./components/FileList";
import BottomBtn from "./components/BottomBtn";
import TabList from "./components/TabList";
import Loader from "./components/Loader";
import useIpcRenderer from "./hooks/useIpcRenderer";
// 使用window.require使用node的api
const { join, basename, extname, dirname } = window.require("path");
const { remote, ipcRenderer } = window.require("electron");
const Store = window.require("electron-store");

// fileStore是本地的文件路径
const fileStore = new Store({ name: "Files Data" });
const settingsStore = new Store({ name: "Settings" });
const getAutoSync = () =>
  ["accessKey", "secretKey", "bucketName", "enableAutoSync"].every(
    (key) => !!settingsStore.get(key)
  );
const saveFilesToStore = (files) => {
  // we don't have to store any info in file system, eg: isNew, body ,etc
  const filesStoreObj = objToArr(files).reduce((result, file) => {
    const { id, path, title, createdAt, isSynced, updatedAt } = file;
    result[id] = {
      id,
      path,
      title,
      createdAt,
      isSynced,
      updatedAt,
    };
    return result;
  }, {});
  fileStore.set("files", filesStoreObj);
};

// App.js是所有组件的数据源，要在这里创建所有数据及状态然后传到各个组件，
function App() {
  // 文件列表，传入FileList组件，初始化数据从本地的Store里面拿
  const [files, setFiles] = useState(fileStore.get("files") || {});
  // 当前正在编辑的文件，传入TabList组件
  const [activeFileID, setActiveFileID] = useState("");
  // 已经打开的文件ID，在TabList显示时使用，传入TabList组件
  const [openedFileIDs, setOpenedFileIDs] = useState([]);
  // 未保存的文件ID，文保存图标是个小圆点，传入TabList组件
  const [unsavedFileIDs, setUnsavedFileIDs] = useState([]);
  // 左侧的搜索，传入FileSearch组件，避免与原来的数组发生冲突
  const [searchedFiles, setSearchedFiles] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const filesArr = objToArr(files);
  const savedLocation =
    settingsStore.get("savedFileLocation") || remote.app.getPath("documents");

  const activeFile = files[activeFileID];

  // 根据openedFileIDs数组查找已打开的文件ID，传入TabList组件
  const openedFiles = openedFileIDs.map((openID) => {
    return files[openID];
  });

  // 假如Search里面由内容就是Search里面
  const fileListArr = searchedFiles.length > 0 ? searchedFiles : filesArr;

  // 文件的点击事件
  const fileClick = (fileID) => {
    // 保存打开的文件的ID
    setActiveFileID(fileID);
    const currentFile = files[fileID];
    const { id, title, path, isLoaded } = currentFile;

    // isLoaded使得每次点击不需要再次读取
    if (!isLoaded) {
      if (getAutoSync()) {
        ipcRenderer.send("download-file", { key: `${title}.md`, path, id });
      } else {
        // 如果当前的文件是没打开的就添加isLoaded属性
        fileHelper.readFile(currentFile.path).then((value) => {
          const newFile = { ...files[fileID], body: value, isLoaded: true };
          setFiles({ ...files, [fileID]: newFile });
        });
      }
    }

    // 没有打开的时候才加进去
    if (!openedFileIDs.includes(fileID)) {
      setOpenedFileIDs([...openedFileIDs, fileID]);
    }
  };

  // Tab的点击事件
  const tabClick = (fileID) => {
    // set current active file
    setActiveFileID(fileID);
  };

  // 关闭Tab的点击事件
  const tabClose = (id) => {
    //通过ID过滤
    const tabsWithout = openedFileIDs.filter((fileID) => fileID !== id);
    setOpenedFileIDs(tabsWithout);
    // 删掉当前高亮后设置默认高亮
    if (tabsWithout.length > 0) {
      setActiveFileID(tabsWithout[0]);
    } else {
      setActiveFileID("");
    }
  };

  // 修改文件的事件
  const fileChange = (id, value) => {
    if (value !== files[id].body) {
      const newFile = { ...files[id], body: value };
      setFiles({ ...files, [id]: newFile });

      // 修改文件时要更新文保存的ID数组
      if (!unsavedFileIDs.includes(id)) {
        setUnsavedFileIDs([...unsavedFileIDs, id]);
      }
    }
  };

  // 删除文件的回调
  const deleteFile = (id) => {
    // 要判断是不是新建的文件在删除，因为新建的文件还没有进行持久化
    if (files[id].isNew) {
      // 取出要删除的文件以外的文件，如果是delete files[id] ; setFiles(files)功能就没有效果，因为setFiles引用的还是
      // 同一个files，不会重新渲染
      const { [id]: value, ...afterDelete } = files;
      setFiles(afterDelete);
    } else {
      // 先在本地删除，然后更新Store以及要渲染的setFiles
      fileHelper.deleteFile(files[id].path).then(() => {
        const { [id]: value, ...afterDelete } = files;
        setFiles(afterDelete);
        saveFilesToStore(afterDelete);
        // 如果文件已经打开就把tab关掉
        tabClose(id);
      });
    }
  };

  // 文件重命名的回调，第三个参数表示是否是新建的文件重命名
  const updateFileName = (id, title, isNew) => {
    const newPath = isNew
      ? join(savedLocation, `${title}.md`)
      : join(dirname(files[id].path), `${title}.md`);
    // 如果不是新的文件在保存时要拿到原来的path
    const modifiedFile = { ...files[id], title, isNew: false, path: newPath };
    const newFiles = { ...files, [id]: modifiedFile };

    // 对于是否是新建的文件有不同的处理
    if (isNew) {
      fileHelper.writeFile(newPath, files[id].body).then(() => {
        setFiles(newFiles);

        // 持久化
        saveFilesToStore(newFiles);
      });
    } else {
      const oldPath = files[id].path;
      fileHelper.renameFile(oldPath, newPath).then(() => {
        setFiles(newFiles);
        saveFilesToStore(newFiles);
      });
    }
  };

  // 搜索文件的回调
  const fileSearch = (keyword) => {
    // filter out the new files based on the keyword
    const newFiles = filesArr.filter((file) => file.title.includes(keyword));
    setSearchedFiles(newFiles);
  };

  // 新建文件的回调
  const createNewFile = () => {
    const newID = uuidv4();
    const newFile = {
      id: newID,
      title: "",
      body: "## 请输出 Markdown",
      createdAt: new Date().getTime(),
      isNew: true,
    };
    setFiles({ ...files, [newID]: newFile });
  };

  // 保存文件的回调
  const saveCurrentFile = () => {
    const { path, body, title } = activeFile;
    fileHelper.writeFile(path, body).then(() => {
      // 保存后把当前操作的保存状态更新掉
      setUnsavedFileIDs(unsavedFileIDs.filter((id) => id !== activeFile.id));
      if (getAutoSync()) {
        ipcRenderer.send("upload-file", { key: `markdown/${title}.md`, path });
      }
    });
  };

  // 导入文件的回调
  const importFiles = () => {
    remote.dialog.showOpenDialog(
      {
        title: "选择导入的 Markdown 文件",
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Markdown files", extensions: ["md"] }],
      },
      (paths) => {
        // 如果是个数组在进行后面的操作
        if (Array.isArray(paths)) {
          // filter out the path we already have in electron store
          // ["/Users/liusha/Desktop/name1.md", "/Users/liusha/Desktop/name2.md"]

          // 导入有可能重复，所以要进行过滤
          const filteredPaths = paths.filter((path) => {
            // 找到后取反
            const alreadyAdded = Object.values(files).find((file) => {
              return file.path === path;
            });
            return !alreadyAdded;
          });

          // 将导入的文件包装成对象的形式，有id，path等
          const importFilesArr = filteredPaths.map((path) => {
            return {
              id: uuidv4(),
              // 显示的标题只要文件名
              title: basename(path, extname(path)),
              path,
            };
          });

          // 上面包装完成后再转为map形式
          const newFiles = { ...files, ...flattenArr(importFilesArr) };
          // setState and update electron store
          setFiles(newFiles);
          saveFilesToStore(newFiles);
          if (importFilesArr.length > 0) {
            remote.dialog.showMessageBox({
              type: "info",
              title: `成功导入了${importFilesArr.length}个文件`,
              message: `成功导入了${importFilesArr.length}个文件`,
            });
          }
        }
      }
    );
  };
  const activeFileUploaded = () => {
    const { id } = activeFile;
    const modifiedFile = {
      ...files[id],
      isSynced: true,
      updatedAt: new Date().getTime(),
    };
    const newFiles = { ...files, [id]: modifiedFile };
    setFiles(newFiles);
    saveFilesToStore(newFiles);
  };
  const activeFileDownloaded = (event, message) => {
    const currentFile = files[message.id];
    const { id, path } = currentFile;
    fileHelper.readFile(path).then((value) => {
      let newFile;
      if (message.status === "download-success") {
        newFile = {
          ...files[id],
          body: value,
          isLoaded: true,
          isSynced: true,
          updatedAt: new Date().getTime(),
        };
      } else {
        newFile = { ...files[id], body: value, isLoaded: true };
      }
      const newFiles = { ...files, [id]: newFile };
      setFiles(newFiles);
      saveFilesToStore(newFiles);
    });
  };
  const filesUploaded = () => {
    const newFiles = objToArr(files).reduce((result, file) => {
      const currentTime = new Date().getTime();
      result[file.id] = {
        ...files[file.id],
        isSynced: true,
        updatedAt: currentTime,
      };
      return result;
    }, {});
    setFiles(newFiles);
    saveFilesToStore(newFiles);
  };

  // 原生菜单的监听事件
  useIpcRenderer({
    "create-new-file": createNewFile,
    "import-file": importFiles,
    "save-edit-file": saveCurrentFile,
    "active-file-uploaded": activeFileUploaded,
    "file-downloaded": activeFileDownloaded,
    "files-uploaded": filesUploaded,
    "loading-status": (message, status) => {
      setLoading(status);
    },
  });
  return (
    <div className="App container-fluid px-0">
      {isLoading && <Loader />}
      <div className="row no-gutters">
        <div className="col-3 bg-light left-panel">
          <FileSearch title="我的文档" onFileSearch={fileSearch} />
          {/* 假如Search里面由内容就是Search里面 */}
          <FileList
            files={fileListArr}
            onFileClick={fileClick}
            onFileDelete={deleteFile}
            onSaveEdit={updateFileName}
          />
          <div className="row no-gutters button-group">
            <div className="col">
              <BottomBtn
                text="新建"
                colorClass="btn-primary"
                icon={faPlus}
                onBtnClick={createNewFile}
              />
            </div>
            <div className="col">
              <BottomBtn
                text="导入"
                colorClass="btn-success"
                icon={faFileImport}
                onBtnClick={importFiles}
              />
            </div>
          </div>
        </div>
        <div className="col-9 right-panel">
          {/* 如果没有已打开的文件显示下面样式，否则就会显示空白 */}
          {!activeFile && (
            <div className="start-page">选择或者创建新的 Markdown 文档</div>
          )}
          {activeFile && (
            <>
              <TabList
                files={openedFiles}
                activeId={activeFileID}
                unsaveIds={unsavedFileIDs}
                onTabClick={tabClick}
                onCloseTab={tabClose}
              />
              <SimpleMDE
                // 设置key解决切换文件后内容并没有切换
                key={activeFile && activeFile.id}
                value={activeFile && activeFile.body}
                onChange={(value) => {
                  fileChange(activeFile.id, value);
                }}
                options={{
                  minHeight: "730px",
                }}
              />
              {activeFile.isSynced && (
                <span className="sync-status">
                  已同步，上次同步{timestampToString(activeFile.updatedAt)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
