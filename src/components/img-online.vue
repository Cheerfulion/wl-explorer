<template>
  <div class="img-pre-box" @click="imgClose('close')">
    <h3 class="img-player-h3"><i class="el-icon-circle-close video-player-icon" @click="imgClose"></i></h3>
    <!-- <pic-zoom :url="imgUrl"></pic-zoom> -->
    <div class="img-box">
      <img class="u-img-pre" :src="imgUrl" alt="图片">
    </div>
  </div>
</template>

<script>
// import picZoom from "vue-piczoom";
export default {
  props: {
    url: {
      type: String
    }
  },
  mounted() {
    // 绑定键盘事件
    window.addEventListener("keyup", this.imgClose, false);
  },
  methods: {
    imgClose(e) {
      if (e == "close") {
        this.$emit("closeImg");
        return;
      }

      if (e.keyCode === 27) {
        this.$emit("closeImg");
      }
    }
  },
  computed: {
    imgUrl() {
      return this.url;
    }
  },
  beforeDestroy() {
    // 卸载键盘事件
    window.removeEventListener("keyup", this.imgClose, false);
  }
};
</script>

<style lang="scss">
.img-pre-box {
  position: absolute;
  top: 5%;
  left: 10%;
  width: 80%;
  height: 90%;
  z-index: 99;
  background-color: #fff;
  text-align: center;

  .img-box {
    background-color: #000;
    min-height: 200px;
  }

  .u-img-pre {
    max-width: 100%;
    max-height: 100%;
  }

  > .img-player-h3 {
    position: relative;
    z-index: 9;
    margin-bottom: -10px;
    padding: 10px 15px 0;
    height: 26px;
    text-align: right;
    background-color: #000;

    > .video-player-icon {
      color: #fff;
      font-size: 20px;
      cursor: pointer;
    }
  }
}
</style>


