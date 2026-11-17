/* Pasang service worker supaya halaman yang pernah dibuka tetap tampil tanpa jaringan.
 * Alamat sw.js dihitung dari alamat berkas ini (assets/daftar-sw.js), jadi tidak bergantung pada akar domain. */
(function () {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  var ini = document.currentScript && document.currentScript.src;
  if (!ini) return;
  var sw = new URL('../sw.js', ini).href;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(sw).catch(function () { /* tanpa mode offline */ });
  });
})();
