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
    // position      // color          // index
    -1, -1, -1,      0,  0,  0,  1,    //   0
    -1, -1,  1,      0,  0,  1,  1,    //   1
    -1,  1, -1,      0,  1,  0,  1,    //   2
    -1,  1,  1,      0,  1,  1,  1,    //   3
     1, -1, -1,      1,  0,  0,  1,    //   4
     1, -1,  1,      1,  0,  1,  1,    //   5
     1,  1, -1,      1,  1,  0,  1,    //   6
     1,  1,  1,      1,  1,  1,  1,    //   7
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
})

device.queue.writeBuffer(indexBuffer, 0, indices);

const vertexLayout: GPUVertexBufferLayout = {
  arrayStride: 28, // (3 + 4) * 4, ker je v bajtih
  attributes: [
    {
      format: 'float32x3',
      offset: 0,
      shaderLocation: 0,
    },
    {
      format: 'float32x4',
      offset: 12, // tri komponente preskočimo: 3 * 4
      shaderLocation: 1
    }
  ]
}

const response = await fetch("./shader.wgsl");
const code = await response.text();

const shaderModule = device.createShaderModule({ code });

const pipeline = device.createRenderPipeline({
  vertex: {
    module: shaderModule,
    buffers: [vertexLayout]
  },
  fragment: {
    module: shaderModule,
    targets: [{ format }], 
  },
  layout: "auto",
  primitive: {
    topology: "triangle-list",
  },
});

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
  }]
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