<template>
  <div id="app">
    <AppOldView></AppOldView>
    <ShareFileView></ShareFileView>
    <SupportFileView></SupportFileView>
  </div>
</template>

<script>
import AppOldView from '@/views/AppOldView'
import ShareFileView from '@/views/ShareFileView'
import SupportFileView from '@/views/SupportFileView'

export default {
  name: 'App',
  components: {
    AppOldView,
    ShareFileView,
    SupportFileView
  },
  data() {
    return {}
  }
}
</script>

<style lang="scss" scoped>
#app {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  > * {
    flex: 1;
    overflow: hidden;
    border: 1px solid #000;
    margin: 10px 25px;
  }
}
</style>