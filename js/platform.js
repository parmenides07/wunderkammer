// Run before styles: this is a typography fallback, not browser detection.
// iPadOS can identify as MacIntel; conservatively exclude multitouch/mobile
// devices. Spoofed/restricted platform signals (and future touch Macs) may opt out.
(() => {
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  const mobile = navigator.userAgentData?.mobile ||
    /iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    navigator.maxTouchPoints > 1;
  if (/^Mac/i.test(platform) && !mobile) {
    document.documentElement.classList.add('platform-macos');
  }
})();
