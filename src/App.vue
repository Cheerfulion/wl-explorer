<template>
  <div id="app">
    <!-- <AppOldView></AppOldView> -->
    <ShareFileView></ShareFileView>
    <!-- <SupportFileView></SupportFileView> -->
  </div>
</template>

<script>
// import AppOldView from '@/views/AppOldView'
import ShareFileView from '@/views/ShareFileView'
// import SupportFileView from '@/views/SupportFileView'

export default {
  name: 'App',
  components: {
    // AppOldView,
    ShareFileView,
    // SupportFileView
  },
  data() {
    return {}
  }
}
</script>

<style lang="scss" scoped>

</style>