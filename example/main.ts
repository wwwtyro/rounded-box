import REGL from "regl";
import { mat4 } from "gl-matrix";
import Trackball from "trackball-controller";
import { generateRoundedBox } from "../src/index";

import { textureData } from "./texture";

const regl = REGL();
const canvas = document.getElementsByTagName("canvas")[0];
canvas.style.touchAction = "none";

const texture = regl.texture({
  data: textureData,
  width: 512,
  height: 512,
  format: "alpha",
  wrap: "repeat",
  min: "linear mipmap linear",
  mag: "linear",
});

const render = regl({
  vert: `
      precision mediump float;
      attribute vec3 position, normal;
      uniform mat4 model, view, projection;
      varying vec3 vNormal, voNormal, vPos;
      void main() {
        gl_Position = projection * view * model * vec4(position, 1);
        vNormal = (model * vec4(normal, 1)).xyz;
        voNormal = normal;
        vPos = position.xyz;
      }`,
  frag: `
      precision mediump float;
      uniform sampler2D texture;
      varying vec3 vNormal, voNormal, vPos;
      void main() {
        vec3 onormal = normalize(voNormal);
        vec3 blend = abs(onormal);
        blend /= blend.x + blend.y + blend.z;
        vec3 texel = vPos;
        float tex = 0.0;
        tex += blend.x * texture2D(texture, texel.yz).a;
        tex += blend.y * texture2D(texture, texel.xz).a;
        tex += blend.z * texture2D(texture, texel.xy).a;
        vec3 lightDir = normalize(vec3(1,0,2));
        float intensity = 0.5 + 0.5 * clamp(dot(normalize(vNormal), lightDir), 0.0, 1.0);
        vec3 color = intensity * mix(vec3(0.5,0.0,0), vec3(1,0.5,0.5), tex) + vec3(pow(intensity, 257.0));
        gl_FragColor = vec4(color,1);
      }`,
  attributes: {
    position: regl.prop<any, any>("positions"),
    normal: regl.prop<any, any>("normals"),
  },
  uniforms: {
    texture,
    model: regl.prop<any, any>("model"),
    view: regl.prop<any, any>("view"),
    projection: regl.prop<any, any>("projection"),
  },
  cull: {
    enable: true,
    face: "back",
  },
  elements: regl.prop<any, any>("cells"),
  viewport: regl.prop<any, any>("viewport"),
});

const trackball = new Trackball(canvas, { drag: 0.01 });
trackball.spin(20, 3);

const view = mat4.lookAt(mat4.create(), [0, 0, 3], [0, 0, 0], [0, 1, 0]);

const box = generateRoundedBox({ width: 1, height: 1.25, depth: 1.5 });
const positions = regl.buffer(box.positions);
const normals = regl.buffer(box.normals);
const cells = regl.elements(box.cells);

function loop() {
  const projection = mat4.perspective(mat4.create(), Math.PI / 3, canvas.width / canvas.height, 0.1, 100);
  const viewport = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  regl.clear({
    color: [1, 1, 1, 1],
    depth: 1,
  });
  render({
    positions,
    normals,
    cells,
    count: box.positions.length,
    model: trackball.rotation,
    view,
    projection,
    viewport,
  });
  requestAnimationFrame(loop);
}

loop();
