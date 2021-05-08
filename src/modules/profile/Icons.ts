import { ProfileType } from "./WhatProfile";
// Here are the icons, in base64
const BASE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA";
// Mojang official
const MOJANG =
  "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";
// Bad Forge
const FORGE =
  "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";
// Good Fabric!
const FABRIC =
  "DQAAAA4CAYAAACyutuQAAABrklEQVRoBe3ZMU4DQQwF0D0PNQWX4gIUiDMgKkQLJUVEmZqansMM2s56jTXKZHYTHGmk+Rqvx9//O4vIskz+3N3etLgmXz/+ukhm3Y+/YXLGIjS54el1KvL789Xi8jxNuHWABUcy697zretN77fgIpS2bHKACn0f31tcF6dYEdr7XxIXr5AEshk5Ht5aXFn85K+AZSlCpdCZTafF4jtm3TsTYp+P87Tus/jh9CyoCPHeKYVO9ZwW0+Pi0Rb0fnE3PxNIQFyEkpmyoeL/p5Ad0FK9WAuK/Zbz/qeH+xaX56lCPtBLwHgJiIsQM3f9CvVaTMtosQxrMbH1iIcrUoT4z6mKiFVEfP0Kyfjz46XFlc2A51pQbHymSKqAAUWIGbDjKiI2vhTSYmIt9/r82OKK87Tu7XCGVUDs/dbXjU0Yyaz7IsSMqYjYhnYr4gMmvHiFzk3w7IpIQDxasSJkh0/FV6eQDekluLnFJCAuQvzeY0Ns2HRsQdl7aveWs4MZQc/F5tscW6CKeS7enIAFWGARskN7wyom3lu9aT0SEKcJ9hYgAfHe6k3rkYA4TTA44A/XJKtjucJ1iAAAAABJRU5ErkJggg==";
// Not recognized
const UNIVERSAL =
  "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";

export function getIconFor(type: ProfileType): string {
  switch (type) {
    case ProfileType.FABRIC:
      return BASE + FABRIC;
    case ProfileType.MOJANG:
      return BASE + MOJANG;
    case ProfileType.FORGE:
      return BASE + FORGE;
    default:
      return BASE + UNIVERSAL;
  }
}