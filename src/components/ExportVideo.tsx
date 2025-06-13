import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ExportVideoProps {
  onExport: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
}

export interface ExportOptions {
  filename: string;
  quality: 'low' | 'medium' | 'high';
  format: 'mp4' | 'webm' | 'gif' | 'png' | 'jpg';
  includeAudio: boolean;
  duration: number;
  fps: number;
  resolution: '480p' | '720p' | '1080p' | '4k';
  currentTime?: number;
  capturedFrames?: Uint8Array[];
  frameRate?: number;
}

const ExportVideo = ({ onExport, isExporting }: ExportVideoProps) => {
  const [filename, setFilename] = useState('periodic_lyrics_video');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [format, setFormat] = useState<'mp4' | 'webm' | 'gif' | 'png' | 'jpg'>('mp4');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [duration, setDuration] = useState(10);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p' | '4k'>('1080p');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const handleExport = () => {
    if (!filename.trim()) {
      toast({
        title: "Filename required",
        description: "Please enter a filename for your export",
        variant: "destructive"
      });
      return;
    }
    
    // Validate format and audio combination
    if (format === 'gif' && includeAudio) {
      toast({
        title: "Invalid combination",
        description: "GIF format doesn't support audio. Audio will be excluded.",
        variant: "destructive"
      });
    }

    if ((format === 'png' || format === 'jpg') && duration > 0) {
      toast({
        title: "Image format selected",
        description: "Image formats will export a single frame at current time",
      });
    }
    
    onExport({
      filename,
      quality,
      format,
      includeAudio: includeAudio && format !== 'gif' && format !== 'png' && format !== 'jpg',
      duration,
      fps,
      resolution
    });
    
    toast({
      title: "Export started",
      description: `Your ${format.toUpperCase()} is being prepared for download`
    });
    
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Periodic Lyrics Video</DialogTitle>
          <DialogDescription>
            Configure your video export settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="filename" className="text-right">
              Filename
            </Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select value={format} onValueChange={(value: 'mp4' | 'webm' | 'gif' | 'png' | 'jpg') => setFormat(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4 Video</SelectItem>
                <SelectItem value="webm">WebM Video</SelectItem>
                <SelectItem value="gif">Animated GIF</SelectItem>
                <SelectItem value="png">PNG Image</SelectItem>
                <SelectItem value="jpg">JPG Image</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="resolution" className="text-right">
              Resolution
            </Label>
            <Select value={resolution} onValueChange={(value: '480p' | '720p' | '1080p' | '4k') => setResolution(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="480p">480p (854×480)</SelectItem>
                <SelectItem value="720p">720p (1280×720)</SelectItem>
                <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                <SelectItem value="4k">4K (3840×2160)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quality" className="text-right">
              Quality
            </Label>
            <Select value={quality} onValueChange={(value: 'low' | 'medium' | 'high') => setQuality(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Fast)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="high">High (Best Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(format === 'mp4' || format === 'webm' || format === 'gif') && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  Duration (s)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="300"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Math.min(300, parseInt(e.target.value) || 1)))}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fps" className="text-right">
                  Frame Rate
                </Label>
                <Select value={fps.toString()} onValueChange={(value) => setFps(parseInt(value))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 FPS</SelectItem>
                    <SelectItem value="24">24 FPS</SelectItem>
                    <SelectItem value="30">30 FPS</SelectItem>
                    <SelectItem value="60">60 FPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(format === 'mp4' || format === 'webm') && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="includeAudio" className="text-right">
                Include Audio
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <input
                  type="checkbox"
                  id="includeAudio"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">Add audio track to the video</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportVideo;