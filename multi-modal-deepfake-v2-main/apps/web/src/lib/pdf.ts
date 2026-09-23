import domToImage from 'dom-to-image';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';

export const downloadPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  toast.loading('Generating PDF...', { id: 'pdf-toast' });

  // Temporarily force light mode on the HTML tag so the PDF looks like a clean document
  const htmlElement = document.documentElement;
  const wasDark = htmlElement.classList.contains('dark');
  if (wasDark) htmlElement.classList.remove('dark');
  htmlElement.classList.add('light');

  try {
    // Wait a brief moment for the browser to apply CSS variables
    await new Promise(resolve => setTimeout(resolve, 50));

    const dataUrl = await domToImage.toPng(element, { 
      bgcolor: '#ffffff',
      quality: 1.0,
      style: {
        padding: '32px', // Add some nice padding around the PDF contents
      }
    });
    
    // Get actual dimensions
    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => img.onload = resolve);
    
    // Create PDF with pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([img.width, img.height]);
    
    // embed the PNG
    const pngImage = await pdfDoc.embedPng(dataUrl);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
    
    // Save to bytes and trigger download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('PDF downloaded!', { id: 'pdf-toast' });
  } catch (error) {
    console.error('PDF generation error:', error);
    toast.error('Failed to generate PDF', { id: 'pdf-toast' });
  } finally {
    // Restore dark mode immediately after capturing
    htmlElement.classList.remove('light');
    if (wasDark) htmlElement.classList.add('dark');
  }
};
