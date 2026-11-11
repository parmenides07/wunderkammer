module.exports = async page => {
  await page.waitForFunction(() => !document.documentElement.dataset.loading && document.documentElement.dataset.slug === location.hash.split('/').at(-1));
};
