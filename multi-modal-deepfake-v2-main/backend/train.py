import os
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification, TrainingArguments, Trainer
from datasets import load_dataset
from torchvision.transforms import Compose, RandomResizedCrop, RandomHorizontalFlip, ColorJitter, ToTensor, Normalize
import evaluate
import numpy as np

def main():
    model_id = "dima806/deepfake_vs_real_image_detection"
    output_dir = "./custom_weights"
    dataset_dir = "dataset"
    
    if os.path.exists(os.path.join(dataset_dir, "train")):
        print(f"📁 Found local dataset at {dataset_dir}. Loading...")
        dataset = load_dataset("imagefolder", data_dir=dataset_dir)
        labels = dataset["train"].features["label"].names
    else:
        print(f"🌐 Local dataset not found. Downloading 'OpenRL/DeepFakeFace' from HuggingFace...")
        # The OpenRL dataset might have specific splits/labels
        dataset = load_dataset("OpenRL/DeepFakeFace")
        # Ensure we have train and validation splits
        if "train" not in dataset:
            # If it only has 'data', rename it
            first_key = list(dataset.keys())[0]
            dataset["train"] = dataset[first_key]
        
        # We need to inspect the labels.
        # Find the column that represents labels (often 'label', 'labels', 'target', etc.)
        label_col = None
        for col in dataset["train"].features.keys():
            if "label" in col.lower() or "target" in col.lower() or "class" in col.lower():
                label_col = col
                break
                
        if label_col and hasattr(dataset["train"].features[label_col], "names"):
            labels = dataset["train"].features[label_col].names
        else:
            labels = ["real", "fake"] # Fallback assumption
            label_col = "label" if "label" in dataset["train"].features else list(dataset["train"].features.keys())[-1]
            
        print(f"🔍 Automatically detected label column: {label_col}")
        
    # Check if 'val' split exists, if not, create one from train
    if "validation" not in dataset and "val" not in dataset:
        print("⚠️ No validation set found. Splitting 20% of train set for validation.")
        split = dataset["train"].train_test_split(test_size=0.2)
        dataset["train"] = split["train"]
        dataset["validation"] = split["test"]
        
    print(f"🚀 Loading Base Model: {model_id}")
    processor = AutoImageProcessor.from_pretrained(model_id)
        
    # Set the label_col variable globally for the preprocess functions to use
    if "label_col" not in locals():
        label_col = "label"
        
    try:
        labels = dataset["train"].features[label_col].names
    except:
        labels = ["real", "fake"]
        
    print(f"📊 Found classes: {labels}")
    
    # Define augmentations to prevent the AI from memorizing the images
    size = (processor.size["height"], processor.size["width"])
    
    # Fallback to standard ImageNet mean/std if processor doesn't specify
    image_mean = processor.image_mean if hasattr(processor, "image_mean") else [0.485, 0.456, 0.406]
    image_std = processor.image_std if hasattr(processor, "image_std") else [0.229, 0.224, 0.225]
    
    train_transforms = Compose([
        RandomResizedCrop(size),
        RandomHorizontalFlip(),
        ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1, hue=0.1),
        ToTensor(),
        Normalize(mean=image_mean, std=image_std),
    ])
    
    val_transforms = Compose([
        RandomResizedCrop(size), # simpler crop for val
        ToTensor(),
        Normalize(mean=image_mean, std=image_std),
    ])

    def preprocess_train(example_batch):
        example_batch["pixel_values"] = [train_transforms(image.convert("RGB")) for image in example_batch["image"]]
        
        corrected_labels = []
        if label_col == "image":
            # If there's no label column, infer it from the image filename (e.g. 'fake/img1.jpg')
            for img in example_batch["image"]:
                filename = getattr(img, "filename", "") or ""
                if "fake" in filename.lower() or "text2img" in filename.lower() or "inpainting" in filename.lower() or "insight" in filename.lower():
                    corrected_labels.append(1)
                else:
                    # Default to real (wiki dataset)
                    corrected_labels.append(0)
        else:
            for label_idx in example_batch[label_col]:
                try:
                    label_name = labels[label_idx].lower()
                except:
                    label_name = str(label_idx).lower()
                    
                if "fake" in label_name or label_name == "1":
                    corrected_labels.append(1)
                else:
                    corrected_labels.append(0)
                    
        example_batch["label"] = corrected_labels
        return example_batch

    def preprocess_val(example_batch):
        example_batch["pixel_values"] = [val_transforms(image.convert("RGB")) for image in example_batch["image"]]
        
        corrected_labels = []
        if label_col == "image":
            for img in example_batch["image"]:
                filename = getattr(img, "filename", "") or ""
                if "fake" in filename.lower() or "text2img" in filename.lower() or "inpainting" in filename.lower() or "insight" in filename.lower():
                    corrected_labels.append(1)
                else:
                    corrected_labels.append(0)
        else:
            for label_idx in example_batch[label_col]:
                try:
                    label_name = labels[label_idx].lower()
                except:
                    label_name = str(label_idx).lower()
                    
                if "fake" in label_name or label_name == "1":
                    corrected_labels.append(1)
                else:
                    corrected_labels.append(0)
                    
        example_batch["label"] = corrected_labels
        return example_batch

    print("🔄 Applying data augmentations...")
    train_ds = dataset["train"].with_transform(preprocess_train)
    val_ds = dataset["validation"].with_transform(preprocess_val)

    # Initialize model
    model = AutoModelForImageClassification.from_pretrained(
        model_id,
        num_labels=2,
        ignore_mismatched_sizes=True,
        id2label={0: "Real", 1: "Fake"},
        label2id={"Real": 0, "Fake": 1}
    )

    # Metrics
    metric = evaluate.load("accuracy")
    def compute_metrics(p):
        return metric.compute(predictions=np.argmax(p.predictions, axis=1), references=p.label_ids)

    # Training arguments optimized for Colab T4 GPU
    training_args = TrainingArguments(
        output_dir=output_dir,
        remove_unused_columns=False,
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=5e-5,
        per_device_train_batch_size=16,
        gradient_accumulation_steps=2,
        per_device_eval_batch_size=16,
        num_train_epochs=5,
        warmup_ratio=0.1,
        logging_steps=10,
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        push_to_hub=False,
        report_to="none", # Disables Weights & Biases prompt
        fp16=torch.cuda.is_available(), # Use mixed precision if GPU is available
        dataloader_num_workers=2
    )
    # Custom data collator to discard the raw 'image' PIL objects which crash torch.tensor()
    def collate_fn(examples):
        pixel_values = torch.stack([example["pixel_values"] for example in examples])
        labels = torch.tensor([example["label"] for example in examples])
        return {"pixel_values": pixel_values, "labels": labels}

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
        data_collator=collate_fn,
    )

    print("🔥 Starting Training...")
    trainer.train()

    print(f"✅ Training Complete! Saving best model to {output_dir}")
    trainer.save_model(output_dir)
    processor.save_pretrained(output_dir)

if __name__ == "__main__":
    main()
