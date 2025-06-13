import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUpload from '@/components/FileUpload';
import LyricsSearch from '@/components/LyricsSearch';
import LyricsDisplay from '@/components/LyricsDisplay';
import AudioPlayer from '@/components/AudioPlayer';
import ExportVideo, { ExportOptions } from '@/components/ExportVideo';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Lyrics, LyricLine } from '@/utils/lyricsService';
import { exportVideo } from '@/utils/videoExporter';
import html2canvas from 'html2canvas';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { LyricsEditor } from '@/components/LyricsEditor';
import { AddMp3Button } from '@/components/AddMp3Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const Index = () => {
  const [audioFile, setAudioFile] = useState<{ file: File; url: string } | null>(null);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLine, setCurrentLine] = useState<LyricLine | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [displayMode, setDisplayMode] = useState<'word' | 'character'>('word');
  const [layout, setLayout] = useState<'grid' | 'flow'>('grid');
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState('lyrics');
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationBackgroundColor, setAnimationBackgroundColor] = useState('bg-black');
  const [chemistryTileColor, setChemistryTileColor] = useState('bg-gray-700');
  
  // New animation and alignment states
  const [mainAxisAlignment, setMainAxisAlignment] = useState<'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'>('center');
  const [crossAxisAlignment, setCrossAxisAlignment] = useState<'start' | 'center' | 'end' | 'stretch'>('center');
  const [animationType, setAnimationType] = useState<'fade' | 'slide' | 'pop' | 'bounce' | 'rotate' | 'scale'>('fade');
  const [backgroundEffect, setBackgroundEffect] = useState<'none' | 'pulse' | 'wave' | 'particles' | 'gradient'>('none');

  // Update current line based on playback time
  useEffect(() => {
    if (!lyrics) return;
    
    const currentLineIndex = lyrics.lines.findIndex(
      (line) => currentTime >= line.startTimeMs && 
      (!line.endTimeMs || currentTime < line.endTimeMs)
    );
    
    if (currentLineIndex !== -1) {
      setCurrentLine(lyrics.lines[currentLineIndex]);
    } else if (lyrics.lines.length > 0) {
      if (currentTime < lyrics.lines[0].startTimeMs) {
        setCurrentLine(null);
      } else if (currentTime >= lyrics.lines[lyrics.lines.length - 1].endTimeMs!) {
        setCurrentLine(lyrics.lines[lyrics.lines.length - 1]);
      }
    }
  }, [currentTime, lyrics]);

  const handleFileSelected = (file: File, url: string) => {
    setAudioFile({ file, url });
  };

  const handleLyricsSelected = (selectedLyrics: Lyrics) => {
    setLyrics(selectedLyrics);
    setActiveTab('data');
    toast({
      title: "Lyrics loaded",
      description: `${selectedLyrics.lines.length} lines of lyrics are ready`
    });
  };

  const handleTimeUpdate = (newTime: number) => {
    setCurrentTime(newTime);
  };

  const handleEnded = () => {
      setIsPlaying(false);
  };

  useEffect(() => {
    const cleanupAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };

    if (audioFile) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = audioFile.url;

      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(err => console.error(`Audio play failed after load: ${err}`));
      }

    } else {
      cleanupAudio();
      setIsPlaying(false);
    }

    return cleanupAudio;

  }, [audioFile, isPlaying]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error("Audio play failed:", err));
      }
      setIsPlaying(!isPlaying);
    } else {
      toast({
        title: "Audio not loaded",
        description: "Please load an audio file to play.",
        variant: "destructive"
      });
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time / 1000;
    }
    setCurrentTime(time);
  };

  const handleExport = async (options: ExportOptions) => {
    const lyricsContainer = canvasRef.current;
    if (!lyricsContainer) {
      toast({
        title: "Export error",
        description: "Lyrics container element not found",
        variant: "destructive"
      });
      return;
    }

    if (!lyrics) {
       toast({
         title: "Export error",
         description: "No lyrics data available for export",
         variant: "destructive"
       });
       return;
    }
    
    setIsExporting(true);
    const initialCurrentTime = currentTime;
    const wasPlaying = isPlaying;
    if (wasPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }

    let progressToast: any;

    try {
      const onProgress = (progress: { stage: string; percentage?: number }) => {
        let description = progress.stage;
        if (progress.percentage !== undefined) {
          description += `: ${progress.percentage}%`;
        }
        
        if (!progressToast) {
          progressToast = toast({
            title: `Exporting ${options.format.toUpperCase()}...`,
            description: description,
            duration: Infinity,
          });
        } else {
          progressToast.update({
            id: progressToast.id,
            title: `Exporting ${options.format.toUpperCase()}...`,
            description: description,
          });
        }
      };

      // Use the optimized export function
      const dataUrl = await exportVideo(options, lyricsContainer, onProgress);

      if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${options.filename}.${options.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (progressToast) {
          progressToast.update({
            id: progressToast.id,
            title: "Download started",
            description: `Your ${options.format.toUpperCase()} download should begin shortly.`,
            duration: 5000,
          });
        }
      }

    } catch (error) {
      console.error('Export failed:', error);
      if (progressToast) {
        progressToast.update({
          id: progressToast.id,
          title: "Export failed",
          description: "There was an error exporting your file",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsExporting(false);
      setCurrentTime(initialCurrentTime);
      if (wasPlaying && audioRef.current) {
        audioRef.current.play().catch(err => console.error(`Audio play failed after export: ${err}`));
        setIsPlaying(true);
      }
    }
  };

  const handleLyricsEdit = (updatedLyrics: Lyrics) => {
    setLyrics(updatedLyrics);
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <a className="mr-6 flex items-center space-x-2" href="/">
              <img 
                src="/logo.png" 
                alt="Lyrical Elements Logo" 
                className="h-8 w-8 object-contain"
                style={{ maxHeight: '32px', maxWidth: '32px' }}
              />
              <span className="font-bold text-lg">Lyrical Elements</span>
            </a>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="md:col-span-1 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="lyrics">Search</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="animation">Animation</TabsTrigger>
              </TabsList>
              <TabsContent value="lyrics" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Lyrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LyricsSearch onLyricsSelected={handleLyricsSelected} onFileSelected={handleFileSelected} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="data" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Lyrics Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lyrics ? (
                      <ScrollArea className="h-[400px]">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{JSON.stringify(lyrics, null, 2)}</pre>
                        </ScrollArea>
                    ) : (
                      <p>No lyrics data loaded.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="edit" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Lyrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LyricsEditor lyrics={lyrics} onSave={handleLyricsEdit} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="animation" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Animation Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-2">
                        <Label className="text-sm font-medium">Display Mode</Label>
                        <ToggleGroup type="single" value={displayMode} onValueChange={(value: "word" | "character") => setDisplayMode(value)} className="justify-start">
                          <ToggleGroupItem value="word">Word by Word</ToggleGroupItem>
                          <ToggleGroupItem value="character">Character by Character</ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Label className="text-sm font-medium">Layout</Label>
                        <ToggleGroup type="single" value={layout} onValueChange={(value: "grid" | "flow") => setLayout(value)} className="justify-start">
                          <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
                          <ToggleGroupItem value="flow">Flow</ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <Separator />

                      <div className="flex flex-col space-y-2">
                        <Label className="text-sm font-medium">Main Axis Alignment</Label>
                        <Select value={mainAxisAlignment} onValueChange={setMainAxisAlignment}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="start">Start</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="end">End</SelectItem>
                            <SelectItem value="space-between">Space Between</SelectItem>
                            <SelectItem value="space-around">Space Around</SelectItem>
                            <SelectItem value="space-evenly">Space Evenly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Label className="text-sm font-medium">Cross Axis Alignment</Label>
                        <Select value={crossAxisAlignment} onValueChange={setCrossAxisAlignment}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="start">Start</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="end">End</SelectItem>
                            <SelectItem value="stretch">Stretch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      <div className="flex flex-col space-y-2">
                        <Label className="text-sm font-medium">Animation Type</Label>
                        <Select value={animationType} onValueChange={setAnimationType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fade">Fade In</SelectItem>
                            <SelectItem value="slide">Slide In</SelectItem>
                            <SelectItem value="pop">Pop In</SelectItem>
                            <SelectItem value="bounce">Bounce In</SelectItem>
                            <SelectItem value="rotate">Rotate In</SelectItem>
                            <SelectItem value="scale">Scale In</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Label className="text-sm font-medium">Background Effect</Label>
                        <Select value={backgroundEffect} onValueChange={setBackgroundEffect}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="pulse">Pulse</SelectItem>
                            <SelectItem value="wave">Wave</SelectItem>
                            <SelectItem value="particles">Particles</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      <div className="flex flex-col space-y-2">
                        <Label className="text-sm font-medium">Background Color</Label>
                        <ToggleGroup type="single" value={animationBackgroundColor} onValueChange={setAnimationBackgroundColor} className="justify-start">
                          <ToggleGroupItem value="bg-black">Black</ToggleGroupItem>
                          <ToggleGroupItem value="bg-blue-900">Blue</ToggleGroupItem>
                          <ToggleGroupItem value="bg-red-900">Red</ToggleGroupItem>
                          <ToggleGroupItem value="bg-purple-900">Purple</ToggleGroupItem>
                          <ToggleGroupItem value="bg-green-900">Green</ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Label className="text-sm font-medium">Chemistry Tile Color</Label>
                        <ToggleGroup type="single" value={chemistryTileColor} onValueChange={setChemistryTileColor} className="justify-start">
                          <ToggleGroupItem value="bg-gray-700">Gray</ToggleGroupItem>
                          <ToggleGroupItem value="bg-green-700">Green</ToggleGroupItem>
                          <ToggleGroupItem value="bg-blue-700">Blue</ToggleGroupItem>
                          <ToggleGroupItem value="bg-red-700">Red</ToggleGroupItem>
                          <ToggleGroupItem value="bg-black">Black</ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <Card>
              <CardHeader>
                <CardTitle>About This Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>🎶 Transform your lyrics into animated chemical elements! 🧪</p>
                <div>
                  <h4 className="font-semibold">How to Use:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use "Search" or "Demo Lyrics" to load.</li>
                    <li>"Data" shows parsed lyrics; "Edit" to refine timings.</li>
                    <li>"Animation" customizes display, alignment, and effects.</li>
                    <li>"Export Video" generates videos in multiple formats.</li>
                  </ul>
                </div>
                <p>✨ This is a <Badge variant="secondary">Enhanced Version</Badge> with advanced features! ✨</p>
                <p className="text-muted-foreground">Created by Rahul. Connect on <a href="https://instagram.com/developer_rahul_" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Instagram</a></p>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-1 space-y-6 flex flex-col items-center justify-center">
            <div className="w-[450px] h-[720px] rounded-lg shadow-inner overflow-hidden" ref={canvasRef}>
              <LyricsDisplay 
                currentLine={currentLine} 
                displayMode={displayMode}
                layout={layout}
                animationBackgroundColor={animationBackgroundColor}
                chemistryTileColor={chemistryTileColor}
                mainAxisAlignment={mainAxisAlignment}
                crossAxisAlignment={crossAxisAlignment}
                animationType={animationType}
                backgroundEffect={backgroundEffect}
              />
            </div>
              
            <Card className="w-[450px] pt-4">
              <CardContent className="p-4 bg-card/80 backdrop-blur-sm">
                <div className="flex justify-between items-center gap-3 w-full">
                  {currentLine && (
                    <p className="text-sm text-muted-foreground font-mono">
                      Now displaying: "{currentLine.text}"
                    </p>
                  )}
                  <ExportVideo onExport={handleExport} isExporting={isExporting} />
                </div>
              </CardContent>
            </Card>
          </div>
                  
          <div className="md:col-span-1 space-y-6">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-center">
                  <AddMp3Button onFileSelected={handleFileSelected} />
                  <Button variant="outline" onClick={() => setActiveTab('animation')}> 
                    <span className="pr-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sliders"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg></span>
                    Animation Settings
                  </Button>
                </div>
                
                <AudioPlayer
                  audioUrl={audioFile?.url}
                  onTimeUpdate={handleTimeUpdate}
                  duration={audioFile ? audioRef.current?.duration * 1000 || 0 : 0}
                  onEnded={handleEnded}
                />

                {lyrics && (
                  <ScrollArea className="h-64 w-full border rounded p-3">
                    <div className="space-y-2">
                      {lyrics.lines.map((line, index) => (
                        <div key={index} className={cn(
                          "text-sm p-2 rounded cursor-pointer transition-colors",
                          currentTime >= line.startTimeMs && (!line.endTimeMs || currentTime < line.endTimeMs) ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                        )} onClick={() => handleSeek(line.startTimeMs)}>
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="text-muted-foreground font-mono">
                              {Math.floor(line.startTimeMs / 1000).toFixed(2)}s
                            </span>
                            {line.endTimeMs && (
                              <span className="text-muted-foreground font-mono">
                                {Math.floor(line.endTimeMs / 1000).toFixed(2)}s
                              </span>
                            )}
                          </div>
                          <div className="text-foreground font-medium">{line.text}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href="https://instagram.com/developer_rahul_"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              developer_rahul_
            </a>
            . The source code is available on{" "}
            <a
              href="https://github.com/developer-rahul/lyrical-elements-react"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;