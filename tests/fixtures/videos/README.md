`loop.webm` is a one-second, 160 × 120 synthetic test pattern used to verify WebM playback without depending on a remote asset.

Generated with:

```sh
ffmpeg -f lavfi -i testsrc2=size=160x120:rate=12 -t 1 -an -c:v libvpx-vp9 loop.webm
```
