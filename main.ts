import { Mat4 } from "gl-matrix";

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

const vertices = new Float32Array ( [
    -0.5, -0.5, 0.0,   1.0, 0.0, 0.0, 1.0,
    0.5, -0.5, 0.0,    0.0, 1.0, 0.0, 1.0,
    -0.5, 0.5, 0.0,    0.0, 0.0, 1.0, 1.0,

    0.5, 0.5, 0.0,     1.0, 1.0, 0.0, 1.0,

]);

const indices = new Uint32Array([
    0, 1, 2,
    1, 3, 2
]);

const VertexBuffer = device.createBuffer({
    size:vertices.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
});

device.queue.writeBuffer(VertexBuffer, 0, vertices);

const indexBuffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
});

device.queue.writeBuffer(indexBuffer, 0, indices);
const vertexLayout: GPUVertexBufferLayout = {
    arrayStride: 28, // 4 bajti * 3 koordinate + 4 bajti * 4 color values = 12 + 16 = 28
    attributes: [
        {
            format: 'float32x3', // 4 bajti * 3 koordinate 
            offset: 0,
            shaderLocation: 0,

        },
        {
            format: 'float32x4', // 4 bajti * 4 color values
            offset: 12,
            shaderLocation: 1
        }
    ]
};

const context = canvas.getContext("webgpu");
if (context === null) {
    throw new Error("Kontekst webgpu ne obstaja.");
}

const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format });

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
        targets: [{ format }]
    },
    layout: "auto",
    primitive: {
        topology: "triangle-list",
    },
});

const translation = Mat4.fromTranslation(new Mat4(), [0.3, 0.0, 0.0]);

const uniformBuffer = device.createBuffer({
    size: (translation as Float32Array).byteLength,
    usage: GPUBufferUsage.COPY_DST |GPUBufferUsage.UNIFORM
});

device.queue.writeBuffer(uniformBuffer, 0, translation as Float32Array);


const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{
        binding: 0,
        resource: uniformBuffer
    }]
});

function update() {
    let time = performance.now() * 0.001;
    let radius = 0.2;
    let x = radius * Math.cos(time);
    let y = radius * Math.sin(time);
    Mat4.fromTranslation(translation, [x, y, 0]);
    device.queue.writeBuffer(uniformBuffer, 0, translation as Float32Array);
}

function render(){

    if (context === null){
        return;
    }

    const commandEncoder = device.createCommandEncoder();
    // Tu bomo zapisovali ukaze

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
    // Tu bomo zapisovali ukaze za izris
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0,uniformBindGroup);
    renderPass.setVertexBuffer(0, VertexBuffer);
    renderPass.setIndexBuffer(indexBuffer, 'uint32');
    renderPass.drawIndexed(6);
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

