import { Mat4 } from 'gl-matrix';


    
const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance"
});

if (adapter === null) {
    throw new Error("Brskalnik ne podpira WebGPUja.");
}
const device = await adapter.requestDevice();

const canvas = document.querySelector("canvas");
if (canvas === null) {
    throw new Error("Platno ne obstaja.");
}

const context = canvas.getContext("webgpu");
if (context === null) {
    throw new Error("Kontekst webgpu ne obstaja.");
}

const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format });

const vertices = new Float32Array([
  // positions     // texcoords
  -1, -1, -1,      0,  0,
  -1, -1,  1,      0,  1,
  -1,  1, -1,      1,  0,
  -1,  1,  1,      1,  1,
   1, -1, -1,      0,  0,
   1, -1,  1,      0,  1,
   1,  1, -1,      1,  0,
   1,  1,  1,      1,  1,
]);

const indices = new Uint32Array([
    0, 1, 2,    2, 1, 3,
    4, 0, 6,    6, 0, 2,
    5, 4, 7,    7, 4, 6,
    1, 5, 3,    3, 5, 7,
    6, 2, 7,    7, 2, 3,
    1, 0, 5,    5, 0, 4,
]);

const viewMatrix = Mat4.fromTranslation(new Mat4(), [0, 0, -5]);

const projectionMatrix = Mat4.perspectiveZO(new Mat4(), 1, 1, 0.01, 1000);


const vertexBuffer = device.createBuffer({
  size: vertices.byteLength,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
})

device.queue.writeBuffer(vertexBuffer, 0, vertices);

const indexBuffer = device.createBuffer({
  size: indices.byteLength,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
});

const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const imageBitmap = await fetch('image.png')
    .then(response => response.blob())
    .then(blob => createImageBitmap(blob));


const texture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height],
    format: 'rgba8unorm',
    usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_DST,
});

device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture },
    [imageBitmap.width, imageBitmap.height]);


device.queue.writeBuffer(indexBuffer, 0, indices);

const vertexBufferLayout: GPUVertexBufferLayout = {
  arrayStride: 20,
  attributes: [
    {
      shaderLocation: 0,
      offset: 0,
      format: "float32x3",
    },
    {
      shaderLocation: 1,
      offset: 12,
      format: "float32x2",
    },
  ],
};

const response = await fetch("./shader.wgsl");
const code = await response.text();

const shaderModule = device.createShaderModule({ code });

const pipeline = device.createRenderPipeline({
  vertex: {
    module: shaderModule,
    buffers: [vertexBufferLayout]
  },
  fragment: {
    module: shaderModule,
    targets: [{ format }], 
  },
  layout: "auto",
  primitive: {
    topology: "triangle-list",
  },
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus',
  },
});

const sampler = device.createSampler();


const modelMatrix = new Mat4();
const uniformBuffer = device.createBuffer({
  size: (modelMatrix).byteLength,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
})
device.queue.writeBuffer(uniformBuffer, 0, modelMatrix);

const uniformBindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{
    binding: 0,
    resource: uniformBuffer
  },
  {
    binding: 1,
    resource: texture.createView()
  },
  { binding: 2, resource: sampler },

]
});
function update() { // Animiramo
  // let time = performance.now() * 0.001; // milisekunde -> sekunde
  // Mat4.fromZRotation(modelMatrix, time);
  // Mat4.translate(modelMatrix, modelMatrix, [0.5, 0, 0]);
  // device.queue.writeBuffer(uniformBuffer, 0, modelMatrix)
  const time = performance.now() / 1000;
  modelMatrix.identity().rotateX(time * 0.6).rotateY(time * 0.7);

}

function render() { // Upodabljamo
  if(context === null) { // lahko tudi if(!context)
    return
  }
  const matrix = new Mat4()
    .multiply(projectionMatrix)
    .multiply(viewMatrix)
    .multiply(modelMatrix);

device.queue.writeBuffer(uniformBuffer, 0, matrix);
  const commandEncoder = device.createCommandEncoder();
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: [0.7, 0.8, 0.9, 1],
        storeOp: "store",
      },
    ],
    depthStencilAttachment: {
    view: depthTexture.createView(),
    depthClearValue: 1,
    depthLoadOp: 'clear',
    depthStoreOp: 'discard',
    }

  });
  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(0, uniformBindGroup)
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.setIndexBuffer(indexBuffer, 'uint32');
  renderPass.drawIndexed(36);

  renderPass.end();
  const commandBuffer = commandEncoder.finish();
  device.queue.submit([commandBuffer]);
}

function frame() {
  update();
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);