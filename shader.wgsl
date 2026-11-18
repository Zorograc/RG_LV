struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texcoords: vec2f,
}

struct FragmentInput {
    @location(0) texcoords: vec2f,
}
struct FragmentOutput {
    @location(0) color: vec4f,
}

@group(0) @binding(0)
var<uniform> transform: mat4x4f;

@group(0) @binding(1)
var baseTexture: texture_2d<f32>;

@group(0) @binding(2)
var baseSampler: sampler;

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = transform * vec4f(input.position, 1.0);
    output.texcoords = input.texcoords;
    return output;
}

@fragment
fn fragment(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;

    output.color = textureSample(baseTexture, baseSampler, input.texcoords);

    return output;
}