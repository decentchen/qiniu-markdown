// const QiniuManager = require("./src/utils/QiniuManager");
const path = require("path");
const qiniu = require("qiniu");

//generate mac
const accessKey = "7UVvXWD4rMihalfRFN-hzobGkDenJZNrW7vqqMVV";
const secretKey = "bviacJ-l1ZyjKnLA7hR-YicV3c8IaI6fRGOaQrJe";
var bucket = "qiniumarkdown";
// const localFile = "/Users/liusha/Desktop/name1.md";
// const key='test.md'
// const downloadPath = path.join(__dirname, key);

// const manager = new QiniuManager(accessKey, secretKey, "qiniumarkdown");

let mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
let config = new qiniu.conf.Config();
config.zone = qiniu.zone.Zone_z2;
var bucketManager = new qiniu.rs.BucketManager(mac, config);

var options = {
  // limit: 10,
  prefix: "markdown/",
};

bucketManager.listPrefix(bucket, options, function (err, respBody, respInfo) {
  if (err) {
    console.log(err);
    throw err;
  }
  if (respInfo.statusCode == 200) {
    //如果这个nextMarker不为空，那么还有未列举完毕的文件列表，下次调用listPrefix的时候，
    //指定options里面的marker为这个值
    var nextMarker = respBody.marker;
    var commonPrefixes = respBody.commonPrefixes;
    console.log(nextMarker);
    console.log(commonPrefixes);
    var items = respBody.items;
    items.forEach(function (item) {
      console.log(item.key);
      // console.log(item.putTime);
      // console.log(item.hash);
      // console.log(item.fsize);
      // console.log(item.mimeType);
      // console.log(item.endUser);
      // console.log(item.type);
    });
  } else {
    console.log(respInfo.statusCode);
    console.log(respBody);
  }
});

// manager.uploadFile(key, downloadPath).then((data) => {
//   console.log('上传成功',data)
// })
//manager.deleteFile(key)
// manager.generateDownloadLink(key).then(data => {
//   console.log(data)
//   return manager.generateDownloadLink('first.md')
// }).then(data => {
//   console.log(data)
// })
//const publicBucketDomain = 'http://pv8m1mqyk.bkt.clouddn.com';

// manager.downloadFile(key, downloadPath).then(() => {
//   console.log('下载写入文件完毕')
// })
