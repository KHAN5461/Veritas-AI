import torch
import os
from fusion_model import CrossModalFusionTransformer

def export_fusion_model():
    print("Exporting Fusion Model to ONNX...")
    model = CrossModalFusionTransformer()
    model.eval()

    # Define dummy inputs matching the (batch_size, seq_len, dim)
    # We'll use a dynamic axis for batch_size and seq_len so Triton can dynamically batch.
    dummy_v = torch.randn(1, 30, 2048)
    dummy_a = torch.randn(1, 30, 768)

    os.makedirs("model_repository/fusion_model/1", exist_ok=True)
    onnx_path = "model_repository/fusion_model/1/model.onnx"

    torch.onnx.export(
        model, 
        (dummy_v, dummy_a),
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['visual_features', 'audio_features'],
        output_names=['fusion_score'],
        dynamic_axes={
            'visual_features': {0: 'batch_size', 1: 'seq_len'},
            'audio_features': {0: 'batch_size', 1: 'seq_len'},
            'fusion_score': {0: 'batch_size'}
        }
    )
    print(f"Successfully exported Fusion Model to {onnx_path}")

def generate_triton_config():
    config = '''name: "fusion_model"
platform: "onnxruntime_onnx"
max_batch_size: 32

input [
  {
    name: "visual_features"
    data_type: TYPE_FP32
    dims: [ -1, 2048 ]
  },
  {
    name: "audio_features"
    data_type: TYPE_FP32
    dims: [ -1, 768 ]
  }
]

output [
  {
    name: "fusion_score"
    data_type: TYPE_FP32
    dims: [ 1 ]
  }
]

dynamic_batching {
  preferred_batch_size: [ 8, 16, 32 ]
  max_queue_delay_microseconds: 50000
}
'''
    with open("model_repository/fusion_model/config.pbtxt", "w") as f:
        f.write(config)
    print("Generated Triton config at model_repository/fusion_model/config.pbtxt")

if __name__ == '__main__':
    export_fusion_model()
    generate_triton_config()
