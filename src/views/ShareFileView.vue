<template>
  <div class="explore" :style="{ height: viewHeight + 'px', 'margin-top': fullScreen ? '54px' : '' }"
    v-loading="loading">
    <!-- :table-height="tableHeight"  -->
    <wlExplorer ref="wl-explorer-cpt" :data="file_table_data" :columns="file_table_columns"
      :props="explorer_prop" :is-folder-fn="isFolderFn" :preview-type="preview.type"
      :preview-options="preview.url" 
      :upload-url="uploadUrl"
      :upload-headers="uploadHeaders"
      :upload-options="uploadOptions"
      @preview="filePreview"
      @search="fileSearch"
      @handleFolder="handleFolder"
      @uploadSuccess="handleUploadSuccess"
      @del="fileDel"
      @upload="fileUpload"
      @download="download"
      @closeFade="closeOtherLayout(fade)"
      @routerPush="_ => fade.folder = false">

      <!-- <template slot="table-column-top" v-if="searching">
        <el-table-column align="left" prop="path" label="路径" width="300" show-overflow-tooltip
          :formatter="pathFormat" />
      </template> -->
      <!-- 没有地方有调用 search 方法导致 searching 一直是false
      <div slot="main" style="text-align: center;margin-top: 5px" v-if="searching">
        <el-pagination @current-change="handleCurrentChange" :current-page="pagination.page" :pager-count="9"
          :page-size="pagination.size" :total="pagination.count" small layout="total, prev, pager, next" />
      </div> -->

      <!-- 操作文件夹滑入区 -->
      <fadeIn v-show="fade.folder">
        <h3 class="edit-header">
          <p>{{folderForm.id?'编辑':'新增'}}文件夹</p>
        </h3>
        <el-scrollbar class="scroll">
          <el-form
            size="medium"
            ref="folderForm"
            label-position="top"
            :model="folderForm"
            :rules="folder_rules"
            class="folderForm rule-form"
            @keyup.enter.native="submitFolderFrom('folderForm')"
          >
            <el-form-item label="文件夹名称 " prop="name">
              <el-input v-model="folderForm.name" placeholder="请输入文件夹名称"></el-input>
            </el-form-item>
            <el-form-item label="备注说明" prop="describe">
              <el-input
                :rows="3"
                type="textarea"
                v-model="folderForm.describe"
                placeholder="请输入备注说明"
              ></el-input>
            </el-form-item>
          </el-form>
        </el-scrollbar>
        <div class="submit-btn-box">
          <submit-btn @btn="submitFolderFrom('folderForm')" :status="load.folder"></submit-btn>
          <el-button size="medium" @click="fade.folder = false">取消</el-button>
        </div>
      </fadeIn>
    </wlExplorer>
  </div>
</template>

<script>
import wlExplorer from "@/pages/WlExplorer"; // 导入本地的文件管理器
// import wlExplorer from "wl-explorer";
// import "wl-explorer/lib/wl-explorer.css"
import fadeIn from "@/components/fade-in"; // 导入文件管理器
import submitBtn from "@/components/submit-btn"; // 导入防抖提交组件
import { closeOtherLayout, arrayToTree } from "@/util"; // 导入关闭其他弹出类视图函数
import request from "@/util/request";
import { Base64 } from "js-base64";
import axios from "axios";
import JSZip from "jszip";
import * as FileSaver from "file-saver";
import streamSaver from 'streamsaver'
import '@/util/zip-stream'
import {getLoginUser, removeLoginUser} from '@/util/auth'

function getQueryParams(url, name){
    var result = {}
    var reg = /[?&][^?&#]+=[^?&#]+/g
    var queryList = url.match(reg) || []
    for(var i = 0; i < queryList.length; i++) {
        var item = queryList[i]
        var temp = item.substring(1).split('=')
        var key = decodeURIComponent(temp[0])
        var value = decodeURIComponent(temp[1])
        result[key] = value;
    }
    return name ? result[name] : result;
}

const serviceHost = getQueryParams(window.location.href, 'serviceHost') || window.location.origin
const kb = 1024, mb = kb * kb, gb = kb * mb
const maxSize = 2000
const getFile = url => {
  return new Promise((resolve, reject) => {
    axios({
      url,
      method: 'get',
      responseType: 'arraybuffer'
    }).then(data => {
      resolve(data.data)
    }).catch(error => {
      reject(error.toString())
    })
  })
}

export default {
  name: "ShareFile",
  components: {
    fadeIn,
    submitBtn,
    wlExplorer,
  },
  props: {
    width: {
      type: Number
    },
    height: {
      type: Number,
      default: window.innerHeight
    },
    type: {
      type: String,
      default: ''
    },
    fullScreen: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      userVisible: true,
      searching: false,
      pagination: {
        page: 1,
        size: 20,
        count: 0,
      },
      searchForm: { keyword: '' },
      file_table_columns: [
        { label: "名称", prop: "name" },
        {
          label: "类型", align: "center", width: 90,
          formatter(row) {
            return row.type === 1 ? "文件夹" : row.suffix
          },
        },
        {
          label: "大小", align: "center", width: 120,
          formatter(row) {
            if (row.size === null) return '-'
            if (row.size < kb) {
              return row.size + 'B'
            } else if (row.size < mb) {
              return (row.size / kb).toFixed(2) + 'KB'
            } else if (row.size < gb) {
              return (row.size / mb).toFixed(2) + 'MB'
            } else {
              return (row.size / gb).toFixed(2) + 'GB'
            }
          },
        },
        {
          label: "作者",
          minWidth: 100,
          align: "center",
          formatter(row) {
            return row.createUser.username || "-";
          },
        },
        { label: "创建日期", prop: "createdTime", align: "center", width: 120 },
        // { label: "修改日期", prop: "updatedTime", align: "center", width: 120 },
      ], // 自定义表格列
      explorer_prop: {
        name: "name",
        match: "name",
        splic: true,
        suffix: "suffix",
        pathId: "id",
        pathName: "path",
        pathPid: "pid",
        pathChildren: "children", // String 路径数据 children字段
        pathConnector: "\\", // String 路径父子数据拼接连接符,默认为'\'
        pathParents: "parents", // String 路径数据所有直系祖先节点自增长identityId逗号拼接
        pathIdentityId: "identityId", // String 路径数据自增长id
      }, // 文件管理器配置项
      fileMeta: { path: '', pid: '' },
      file_table_data: [], // 表格数据
      preview: { type: 'img', url: '' },
      adcd: '',
      herf: window.location.href,
      load: {
        folder: false,
      }, // loading管理
      fade: {
        folder: false,
      }, // 弹出类视图管理
      folderForm: {
        // pid: "",
        name: "",
        // preview: [],
        // handle: [],
        describe: "",
      }, // 文件夹表单
      folder_rules: {
        // pid: [
        //   { required: true, message: "请选择文件路径", trigger: "blur" },
        // ],
        name: [
          { required: true, message: "请填写文件夹名称", trigger: "blur" },
        ],
      }, // 文件夹表单验证
      uploadUrl: '',
      uploadHeaders: {},
      uploadOptions: {}
    }
  },
  computed: {
    viewHeight() {
      if (this.fullScreen) {
        return this.height - 54
      }
      return this.height - 56
    },
    tableHeight() {
      let h = this.viewHeight - 2 - 80 - 26 - 20
      if (this.searching) {
        return h - 31
      }
      return h
    },
    host() {
      // TODO: 
      return serviceHost
    },
  },
  created() {
    this.closeOtherLayout = closeOtherLayout;
    this.uploadUrl = `${serviceHost}/gdwestServer/sky/basic/shareFile`
    this.uploadHeaders = { token: getLoginUser().token }
    this.getFileList()
  },
  watch: {
    type() {
      this.resetFileMeta()
      this.getFileList()
    },
  },
  methods: {
    // 获取文件夹列表
    getFileList(queryParams = {}) {
      this.searching = false
      this.fileMeta.adcd = this.adcd
      this.fileMeta.type = this.type
      Object.assign({pageSize: 1000}, queryParams, this.fileMeta)
      request({
        url: `${serviceHost}/gdwestServer/sky/basic/shareFile`,
        method: "get",
        params: queryParams
      }).then(res => {
        if (res.code !== 'OK') return
        if (!this.userVisible) {
          let data = res.data.list.filter(item => item.type !== 1)
          this.file_table_data = data || []
        } else {
          this.file_table_data = res.data.list || []
        }
      })
    },

    /**
     * 编辑文件夹
     * act:Object 当前选中文件夹
     * type:String 操作类型 add添加edit编辑
     * file:Object 当前路径信息
     */
    handleFolder(act, type, file) {
      console.log('handleFolder', act, type, file);
      if (type==='edit' && act.rourceType === 1) {
        return this.$message.warning('该文件夹不支持编辑')
      }
      this.path = file;
      this.fade.folder = true;
      if (type === "add") {
        this.$refs["folderForm"].resetFields();
        this.folderForm.id = undefined;
        this.folderForm.pid = file.id;
        this.folderForm.path = file.path;
        return;
      }  
      this.folderForm = { ...act };
    },

    // 提交文件夹表单
    submitFolderFrom(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          this.load.folder = true;
          let { id, pid, name, path, describe } = this.folderForm; // 由表单数据模拟服务器返回数据，此处应有服务器返回对应实体
          const data = { id, pid, name, path, describe, type: 1 }
          const addFolderApi = data => request({
            url: `${serviceHost}/gdwestServer/sky/basic/shareFile`,
            method: "post",
            data: {
              ...data,
              path: `${path}/${data.name}`
            }
          })
          const updateFolderApi = data => request({
            url: `${serviceHost}/gdwestServer/sky/basic/shareFile/${data.id}`,
            method: "patch",
            data
          })
          const folderApi = !data.id ? addFolderApi(data) : updateFolderApi(data)
          folderApi.then(res => {
            if (res.code !== 'OK') return
            this.fade.folder = false;
            this.$message({
              showClose: true,
              message: "操作成功",
              type: "success",
            });
            this.getFileList({pid: pid})
          }).finally(() => {
            this.load.folder = false
          })
        }
      });
    },

    // 删除文件
    fileDel(data) {
      console.log('fileDel', data)
      const notDeleteDatas = data.filter(item => item.rourceType === 1) // 收集不可删除数据
      const canDeleteDatas = data.filter(item => item.rourceType !== 1) // 收集可删除数据
      // 不可删除数据进行提示
      if (notDeleteDatas.length) {
        let msg = '<p style="margin: 0 0 10px">以下文件或文件夹不可删除，已自动过滤：</p>';
        notDeleteDatas.forEach((i) => { msg += `<p style="margin: 0 0 10px">${i.name}</p>` })
        this.$message({
          dangerouslyUseHTMLString: true,
          showClose: true,
          message: msg,
          type: "warning",
        });
      }
      if (!notDeleteDatas.length && !canDeleteDatas) return this.$message.warning('未选择文件')
      const deleteIds = canDeleteDatas.map(item => item.id)
      request({
        url: `${serviceHost}/gdwestServer/sky/basic/shareFile/${deleteIds.join(',')}`,
        method: "delete",
      }).then(res => {
        if (res.code !== 'OK') return
        this.getFileList({pid: this.path.id})
      })
    },

    // 判断是否文件夹函数
    isFolderFn(row) {
      return row.type === 1
    },

    // checkSelectable(row) {
    //   return row.type !== 1
    // },

    resetFileMeta() {
      this.fileMeta = { path: '', pid: '' }
    },

    clearBreadcrumb() {
      const that = this.$refs["wl-explorer-cpt"]
      that.path.history = that.path.history.slice(0, 1)
    },

    // backward(file) {
    //   this.searching = false
    //   if (file instanceof Array && file.length > 0) {
    //     this.file_table_data = file[file.length - 1]['data']
    //   }
    // },

    // /**
    //  * 根据关键词搜索文件
    //  * file: Object 文件属性
    //  * search: Boolean 是否搜索（不是表示进入文件夹）
    //  */
    // fileSearch(file, search) {
    //   if (search) {
    //     if (file.key) {
    //       this.clearBreadcrumb()
    //       this.searchForm.keyword = file.key
    //       this.handleCurrentChange(1)
    //     } else {
    //       if (this.type === 'floodProject') {
    //         this.$refs["wl-explorer-cpt"].file = { pid: "", id: "", path: "", key: "" }
    //         this.clearBreadcrumb()
    //         this.resetFileMeta()
    //         this.getFileList()
    //       } else {
    //         this.$message.warning('请输入关键词后再点击搜索')
    //       }
    //     }
    //   } else {
    //     this.resetFileMeta()
    //     this.file_table_data.filter(item => {
    //       if (item.id === file.id) {
    //         this.fileMeta.path = item.path
    //         this.fileMeta.pid = item.id
    //       }
    //     })
    //     this.getFileList()
    //   }
    // },

    /**
     * 根据关键词搜索文件
     * file: Object 文件属性
     * update: Boolean 数据是否需要更新（不需要表示已存在）
     */
    fileSearch(queryParams, update) {
      console.log('fileSearch', queryParams, update);
      if (update) {
        this.path = queryParams;
        this.getFileList(queryParams);
      }
    },

    // search() {
    //   this.searching = true
    //   this.searchForm.adcd = this.adcd
    //   this.searchForm.type = this.type
    //   this.searchForm.page = this.pagination.page
    //   this.searchForm.rows = this.pagination.size
    //   request({
    //     url: `${serviceHost}/gdwestServer/sky/basic/shareFile/search`,
    //     method: "post",
    //     params: this.searchForm
    //   }).then(res => {
    //     if (res && res.data) {
    //       this.file_table_data = res.data.content || []
    //       this.pagination.count = res.data.totalElements
    //     }
    //   })
    // },

    // handleCurrentChange(val) {
    //   this.pagination.page = val
    //   this.search()
    // },

    filePreview(data, cb) {
      const path = data.url || (this.host + data.path)
      console.log('filePreview', path, data)
      // if (data.type === 2) {
      //   this.preview.url = path
      //   this.preview.type = 'img'
      //   cb()
      // } else if (data.type === 3) {
      //   this.preview.url = path + '#toolbar=0'
      //   // this.preview.url = `${this.host}/preview/onlinePreview?url=${encodeURIComponent(Base64.encode(path))}`
      //   this.preview.type = 'iframe'
      //   cb()
      // } else if (data.type === 4) {
      //   // this.preview.url = `${this.host}/preview/onlinePreview?url=${encodeURIComponent(Base64.encode(path))}`
      //   this.preview.url = `https://10.44.47.80:7891/preview/onlinePreview?url=${encodeURIComponent(Base64.encode(path))}`
      //   this.preview.type = 'iframe'
      //   cb()
      // } else {
      //   window.open(path, '_blank')
      // }
      window.open(path, '_blank')
    },

    download(data, func) {
      console.log('download', data, func);
      data = data.filter(item => item.type !== 1)
      if (data.length === 1) {
        const file = data[0]
        if (checkSize(file)) {
          const path = file.url || (this.host + file.path)
          const a = document.createElement('a')
          a.href = path
          a.style.display = 'none'
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          // if (file.type === 2 || file.type === 3) {
          //   fetch(path).then(res => res.blob()).then(blob => {
          //     const a = document.createElement('a')
          //     a.href = URL.createObjectURL(blob)
          //     a.style.display = 'none'
          //     a.download = file.name
          //     document.body.appendChild(a)
          //     a.click()
          //     document.body.removeChild(a)
          //   })
          // } else {
          //   window.open(path)
          // }
        }
        return
      }

      let totalSize = 0
      data.forEach(item => totalSize += item.size)

      const max = window.WritableStream ? maxSize * 2 : maxSize
      if (totalSize > max * mb) {
        this.$message.error(`文件总大小超过${max}MB, 请取消部分文件!`)
        return
      }

      if (window.WritableStream) {
        streamDownload(data)
      } else {
        normalDownload(data)
      }

      function checkSize(file) {
        if (file.size > maxSize * mb) {
          this.$message.error(`'${file.name}'大小超过${maxSize}MB, 请联系管理员获取!`)
          return false
        }
        return true
      }

      function streamDownload(data) {
        const fileIterator = data.map(item => {
          return {
            name: `${item.name}.${item.suffix}`,
            url: item.url || (this.host + item.path)
          }
        }).values()
        const readableZipStream = new ZIP({
          async pull(ctrl) {
            const fileInfo = fileIterator.next()
            if (fileInfo.done) {
              ctrl.close()
            } else {
              const { name, url } = fileInfo.value
              return fetch(url).then(res => {
                ctrl.enqueue({
                  name,
                  stream: () => res.body
                })
              })
            }
          }
        })
        if (readableZipStream.pipeTo) {
          readableZipStream
            .pipeTo(streamSaver.createWriteStream(new Date().getTime() + '.zip'))
            .then(() => this.$message.success('下载成功'))
        } else {
          this.normalDownload(data)
        }
      }

      function normalDownload(data) {

        const zip = new JSZip()
        const promises = []
        data.forEach(item => {
          const path = item.url || (this.host + item.path)
          const promise = getFile(path).then(data => zip.file(`${item.name}.${item.suffix}`, data, { binary: true }))
          promises.push(promise)
        })
        Promise.all(promises).then(() => {
          zip.generateAsync({ type: 'blob' }).then(content => {
            FileSaver.saveAs(content, new Date().getTime())
          })
        })
      }
    },

    /**
     * @name 上传文件提交操作
     */
    fileUpload(file, cb) {
      console.log('fileUpload', file, cb);
      // this.uploadOptions.bb = 1;
      this.uploadOptions.pid = file.pathId
      this.uploadOptions.path = file.path
      cb();
    },

    // 上传完成回调
    handleUploadSuccess({ data }) {
      console.log('handleUploadSuccess', data);
      this.fileSearch({pid: data.pid, key: '' }, true)
    },

    // getTreeSelected(val) {
    //   this.adcd = val.length > 0 ? val[0].id : getLoginUser().dscd.dscd
    // },

    // pathFormat(row, col, cell) {
    //   const arr = cell.split('/')
    //   return '/' + arr.slice(4, arr.length - 1).join('/')
    // },
  }
}
</script>

<style scoped>

.explore>>>.wl-explorer .wl-main-scroll {
  width: 100%;
  height: calc(100% - 105px) !important;
}

/*预览*/
.explore>>>.wl-explorer .file-view-components {
  top: 90px;
  left: 2px;
  right: 2px;
  bottom: 1px;
}

.explore>>>h3 {
  margin-block-start: 0;
  margin-block-end: 0;
}


.explore>>>.file-view>.player-item {
  border-radius: 5px;
}

.explore>>>.u-img-pre {
  object-fit: contain;
}

/*操作栏*/
.explore>>>.wlSelect {
  transform: translateY(-1px);
  background-color: #1B2A3C !important;
  border-color: #3F4854;
  color: #d9d9d9;
}

.explore>>>.el-input__inner {
  /* background-color: #1B2A3C;
  border-color: #1B2A3C; 
  color: #e5e5e5;
  */
  background: #fff;
}

.wl-explorer>>>.file-search {
  color: white;
}

.explore>>>.el-input-group__append,
.el-input-group__prepend {
  background-color: #49a7ea;
  border: 1px solid #49a7ea;
}

.explore>>>.el-input-group__append button.el-button {
  background-color: #49a7ea;
  color: white;
}

.explore>>>.el-input-group__append button.el-button:hover {
  background-color: #66b1ff;
  color: white;
}

.explore>>>.el-tag {
  background-color: #49a7ea;
  border-color: #3F4854;
  color: white;
}

.explore>>>.el-tag .el-tag__close {
  color: white;
}

.explore>>>.el-select .el-tag__close.el-icon-close {
  background-color: transparent;
}

.explore>>>.el-select .el-tag__close.el-icon-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/*面包屑*/
.explore>>>.el-breadcrumb__item:last-child .el-breadcrumb__inner a {
  color: #333;
}

/*表格*/
.explore>>>.el-table--border {
  border: none;
}

.explore>>>.el-table::before {
  height: 0;
}

.explore>>>.el-table::after {
  width: 0;
}



.explore>>>.btn-prev {
  background-color: transparent;
  color: white;
}

.explore>>>.btn-prev:hover {
  background-color: transparent;
  color: #409EFF;
}

.explore>>>.btn-next {
  background-color: transparent;
  color: white;
}

.explore>>>.btn-next:hover {
  background-color: transparent;
  color: #409EFF;
}
</style>