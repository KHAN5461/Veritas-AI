"""
Cross-Modal Fusion Transformer for lip-sync deepfake detection.

NOTE: This module is NOT currently used in the inference pipeline.
The actual fusion logic in app.py uses a weighted average of vision and audio scores.
This architecture is reserved for future training with paired audio-visual embeddings.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F

class CrossModalFusionTransformer(nn.Module):
    def __init__(self, visual_dim=2048, audio_dim=768, hidden_dim=512, num_heads=8, num_layers=2):
        super().__init__()
        
        # Project inputs to shared latent space
        self.visual_proj = nn.Linear(visual_dim, hidden_dim)
        self.audio_proj = nn.Linear(audio_dim, hidden_dim)
        
        # Temporal Cross-Attention Layer
        self.cross_attention = nn.MultiheadAttention(embed_dim=hidden_dim, num_heads=num_heads, batch_first=True)
        
        # Output classification head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )

    def forward(self, visual_features, audio_features):
        '''
        visual_features: (batch, seq_len, visual_dim)
        audio_features: (batch, seq_len, audio_dim)
        '''
        # 1. Project to shared dimension
        v_emb = self.visual_proj(visual_features) # (batch, seq_len, hidden_dim)
        a_emb = self.audio_proj(audio_features)   # (batch, seq_len, hidden_dim)
        
        # 2. Cross-modal Attention (Audio querying Visual, and Visual querying Audio)
        # For lip-sync analysis, we use visual features as queries, audio as keys/values
        attn_out, _ = self.cross_attention(query=v_emb, key=a_emb, value=a_emb)
        
        # 3. Global pooling over temporal sequence
        pooled_v = torch.mean(v_emb, dim=1)
        pooled_attn = torch.mean(attn_out, dim=1)
        
        # 4. Concatenate original pooled visual features with the cross-attended features
        fused_features = torch.cat((pooled_v, pooled_attn), dim=-1)
        
        # 5. Classify
        return self.classifier(fused_features)

if __name__ == '__main__':
    model = CrossModalFusionTransformer()
    print("Cross-Modal Fusion Model Initialized.")
    # Test pass
    dummy_v = torch.randn(2, 30, 2048) # 2 batch, 30 frames, 2048 dim
    dummy_a = torch.randn(2, 30, 768)  # 2 batch, 30 frames, 768 dim
    out = model(dummy_v, dummy_a)
    print("Output shape:", out.shape)
