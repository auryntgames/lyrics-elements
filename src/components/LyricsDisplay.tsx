import { useState, useEffect } from 'react';
import { ElementTile } from '@/components/ElementTile';
import { LyricLine, splitLyricContent } from '@/utils/lyricsService';
import { getElementForChar, Element as PeriodicElement, periodicTable } from '@/utils/periodicTable';
import { cn } from '@/lib/utils';

interface LyricsDisplayProps {
  currentLine: LyricLine | null;
  displayMode: 'word' | 'character';
  layout: 'grid' | 'flow';
  animationBackgroundColor: string;
  chemistryTileColor: string;
  mainAxisAlignment: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  crossAxisAlignment: 'start' | 'center' | 'end' | 'stretch';
  animationType: 'fade' | 'slide' | 'pop' | 'bounce' | 'rotate' | 'scale';
  backgroundEffect: 'none' | 'pulse' | 'wave' | 'particles' | 'gradient';
}

// Define types for the items to be displayed
type ElementDisplayItem = { type: 'element'; text: string; element: PeriodicElement; };
type EmojiDisplayItem = { type: 'emoji'; word: string; emoji: string; };
type SpaceDisplayItem = { type: 'space'; };

type DisplayItem = ElementDisplayItem | EmojiDisplayItem | SpaceDisplayItem;

// Define a map for words that should be replaced by emojis
const wordEmojiMap: { [key: string]: string } = {
  'love': '❤️',
  'heart': '💖',
  'fire': '🔥',
  'broken': '💔',
  'cry': '😢',
  'tears': '😢',
  'star': '⭐',
  'right': '✅',
  'sad': '😢',
  'happy': '😊',
  'go': '🏃',
  'stop': '🛑',
  'play': '▶️',
  'rewind': '⏪',
  'smile': '😄',
  'time': '⏳',
  'peace': '✌️',
  'win': '🏆',
  'wave': '👋',
  '100': '💯',
  'music': '🎵',
  'dance': '💃',
  'party': '🎉',
  'cool': '😎',
  'wow': '😮',
  'yes': '✅',
  'no': '❌',
};

// Define a map for mathematical and physics symbols
const mathPhysicsSymbolsMap: { [key: string]: { symbol: string; name: string; category: string } } = {
  'A': { symbol: '∀', name: 'Universal Quant', category: 'symbol' },
  'B': { symbol: '𝔅', name: 'Magnetic Field', category: 'symbol' },
  'C': { symbol: '℃', name: 'Celsius', category: 'symbol' },
  'D': { symbol: '∆', name: 'Delta', category: 'symbol' },
  'E': { symbol: 'ℯ', name: "Euler's Num", category: 'symbol' },
  'F': { symbol: '∮', name: 'Line Integral', category: 'symbol' },
  'G': { symbol: '𝒢', name: 'Gravity', category: 'symbol' },
  'H': { symbol: 'ℏ', name: 'hbar', category: 'symbol' },
  'I': { symbol: '𝕀', name: 'Identity Matrix', category: 'symbol' },
  'J': { symbol: '𝒥', name: 'Joule', category: 'symbol' },
  'K': { symbol: '𝒦', name: 'Kelvin', category: 'symbol' },
  'L': { symbol: '𝓛', name: 'Lagrangian', category: 'symbol' },
  'M': { symbol: '𝓜', name: 'Mass', category: 'symbol' },
  'N': { symbol: '𝒩', name: 'Normal Dist', category: 'symbol' },
  'O': { symbol: 'Ω', name: 'Ohm', category: 'symbol' },
  'P': { symbol: '∏', name: 'Product', category: 'symbol' },
  'Q': { symbol: 'ℚ', name: 'Rational Nums', category: 'symbol' },
  'R': { symbol: 'ℝ', name: 'Real Nums', category: 'symbol' },
  'S': { symbol: '∑', name: 'Summation', category: 'symbol' },
  'T': { symbol: '⊤', name: 'Truth/Tesla', category: 'symbol' },
  'U': { symbol: 'µ', name: 'Micro', category: 'symbol' },
  'V': { symbol: '√', name: 'Square Root', category: 'symbol' },
  'W': { symbol: '𝒲', name: 'Watt/Work', category: 'symbol' },
  'X': { symbol: '×', name: 'Multiply/Unknown', category: 'symbol' },
  'Y': { symbol: 'γ', name: 'Gamma Ray', category: 'symbol' },
  'Z': { symbol: 'ℤ', name: 'Integers/Atomic', category: 'symbol' },
  '+': { symbol: '+', name: 'Plus', category: 'symbol' },
  '-': { symbol: '-', name: 'Minus', category: 'symbol' },
  '*': { symbol: '*', name: 'Multiply', category: 'symbol' },
  '/': { symbol: '/', name: 'Divide', category: 'symbol' },
  '=': { symbol: '=', name: 'Equals', category: 'symbol' },
  '>': { symbol: '>', name: 'Greater Than', category: 'symbol' },
  '<': { symbol: '<', name: 'Less Than', category: 'symbol' },
  '(': { symbol: '(', name: 'Left Paren', category: 'symbol' },
  ')': { symbol: ')', name: 'Right Paren', category: 'symbol' },
  '[': { symbol: '[', name: 'Left Bracket', category: 'symbol' },
  ']': { symbol: ']', name: 'Right Bracket', category: 'symbol' },
  '{': { symbol: '{', name: 'Left Brace', category: 'symbol' },
  '}': { symbol: '}', name: 'Right Brace', category: 'symbol' },
  'e': { symbol: 'e', name: 'Exponential', category: 'symbol' },
};

// Helper function to get element data for math/physics symbols
const getSymbolElementData = (char: string): PeriodicElement | undefined => {
   const symbolInfo = mathPhysicsSymbolsMap[char.toUpperCase()];
   if (symbolInfo) {
      return {
         symbol: symbolInfo.symbol,
         name: symbolInfo.name,
         atomicNumber: 0,
         atomicWeight: 'N/A',
         category: 'symbol'
      };
   }
   return undefined;
};

const LyricsDisplay = ({ 
  currentLine, 
  displayMode, 
  layout, 
  animationBackgroundColor, 
  chemistryTileColor,
  mainAxisAlignment,
  crossAxisAlignment,
  animationType,
  backgroundEffect
}: LyricsDisplayProps) => {
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [animating, setAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Update display items when the current line changes
  useEffect(() => {
    setAnimating(true);
    setAnimationKey(prev => prev + 1); // Force re-render with new animation
    
    setTimeout(() => {
      if (currentLine) {
        let processedText = currentLine.text;
        processedText = processedText.replace(/-/g, ' ');
        processedText = processedText.replace(/\([^)]*\)/g, (match) => ' '.repeat(match.length));

        const words = processedText.split(' ');
        const newDisplayItems: DisplayItem[] = [];

        for (const word of words) {
          if (word.trim() === '') {
            newDisplayItems.push({ type: 'space' });
            continue;
          }

          let remainingWord = word;
          let wordProcessed = false;

          const lowerWord = word.toLowerCase();
          if (wordEmojiMap[lowerWord]) {
            newDisplayItems.push({ type: 'emoji', word: word, emoji: wordEmojiMap[lowerWord] });
            wordProcessed = true;
          }

          if (!wordProcessed) {
            let i = 0;
            while (i < remainingWord.length) {
              let charProcessed = false;

              if (i + 1 < remainingWord.length) {
                const twoCharOriginalCase = remainingWord.substring(i, i + 2);
                const twoCharStandardCase = twoCharOriginalCase.charAt(0).toUpperCase() + twoCharOriginalCase.charAt(1).toLowerCase();
                if (periodicTable[twoCharStandardCase]) {
                  newDisplayItems.push({ 
                    type: 'element',
                    text: periodicTable[twoCharStandardCase].symbol,
                    element: periodicTable[twoCharStandardCase]
                  });
                  i += 2;
                  charProcessed = true;
                }
              }

              if (!charProcessed) {
                const oneCharOriginalCase = remainingWord.substring(i, i + 1);
                const oneCharStandardCase = oneCharOriginalCase.toUpperCase();
                if (periodicTable[oneCharStandardCase]) {
                   newDisplayItems.push({
                     type: 'element',
                     text: periodicTable[oneCharStandardCase].symbol,
                     element: periodicTable[oneCharStandardCase]
                   });
                  i += 1;
                  charProcessed = true;
                }
              }

              if (!charProcessed) {
                 const currentSymbol = remainingWord.substring(i, i + 1);
                 const symbolElement = getSymbolElementData(currentSymbol);
                 if (symbolElement) {
                    newDisplayItems.push({ 
                       type: 'element',
                       text: symbolElement.symbol,
                       element: symbolElement
                    });
                    i += 1;
                    charProcessed = true;
                 }
              }

              if (!charProcessed) {
                const unmatchedChar = remainingWord.substring(i, i + 1);
                 const unknownElement: PeriodicElement = {
                    symbol: unmatchedChar,
                    name: 'Unknown',
                    atomicNumber: 0,
                    atomicWeight: 'N/A',
                    category: 'unknown'
                 };
                newDisplayItems.push({ type: 'element', text: unmatchedChar, element: unknownElement });
                i += 1;
              }
            }
          }
        }

        setDisplayItems(newDisplayItems);
      } else {
        setDisplayItems([]);
      }
      setAnimating(false);
    }, 50);
  }, [currentLine]);

  // Get alignment classes
  const getMainAxisClass = () => {
    switch (mainAxisAlignment) {
      case 'start': return 'justify-start';
      case 'center': return 'justify-center';
      case 'end': return 'justify-end';
      case 'space-between': return 'justify-between';
      case 'space-around': return 'justify-around';
      case 'space-evenly': return 'justify-evenly';
      default: return 'justify-center';
    }
  };

  const getCrossAxisClass = () => {
    switch (crossAxisAlignment) {
      case 'start': return 'items-start';
      case 'center': return 'items-center';
      case 'end': return 'items-end';
      case 'stretch': return 'items-stretch';
      default: return 'items-center';
    }
  };

  // Get animation class
  const getAnimationClass = () => {
    switch (animationType) {
      case 'fade': return 'animate-fade-in';
      case 'slide': return 'animate-slide-in';
      case 'pop': return 'animate-pop-in';
      case 'bounce': return 'animate-bounce-in';
      case 'rotate': return 'animate-rotate-in';
      case 'scale': return 'animate-scale-in';
      default: return 'animate-fade-in';
    }
  };

  // Get background effect class
  const getBackgroundEffectClass = () => {
    switch (backgroundEffect) {
      case 'pulse': return 'animate-pulse-bg';
      case 'wave': return 'animate-wave-bg';
      case 'particles': return 'animate-particles-bg';
      case 'gradient': return 'animate-gradient-bg';
      default: return '';
    }
  };
  
  if (!currentLine) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center h-full text-white transition-all duration-500 ease-in-out relative overflow-hidden",
        getBackgroundEffectClass()
      )}
      style={{
        background: animationBackgroundColor === 'bg-black' ? '#000000' :
                   animationBackgroundColor === 'bg-blue-900' ? '#1e3a8a' :
                   animationBackgroundColor === 'bg-red-900' ? '#7f1d1d' :
                   animationBackgroundColor === 'bg-purple-900' ? '#581c87' :
                   animationBackgroundColor === 'bg-green-900' ? '#14532d' : '#000000'
      }}>
        <div className="text-2xl mb-2">🧪</div>
        <p className="text-lg font-semibold">No Lyrics Available</p>
        <p className="text-sm">Upload audio and lyrics to get started</p>
      </div>
    );
  }
  
  // Process words for rendering with row-by-row animation
  const processedWords = currentLine?.text
    .replace(/-/g, ' ')
    .replace(/\([^)]*\)/g, (match) => ' '.repeat(match.length))
    .split(' ')
    .filter(word => word !== '')
    .map((word, wordIdx) => {
      const itemsForWord: DisplayItem[] = [];
      let remainingWord = word;
      let wordProcessed = false;

      const lowerWord = word.toLowerCase();
      if (wordEmojiMap[lowerWord]) {
        itemsForWord.push({ type: 'emoji', word: word, emoji: wordEmojiMap[lowerWord] });
        wordProcessed = true;
      }

      if (!wordProcessed) {
        let i = 0;
        while (i < remainingWord.length) {
          let charProcessed = false;

          if (i + 1 < remainingWord.length) {
            const twoCharOriginalCase = remainingWord.substring(i, i + 2);
            const twoCharStandardCase = twoCharOriginalCase.charAt(0).toUpperCase() + twoCharOriginalCase.charAt(1).toLowerCase();
            if (periodicTable[twoCharStandardCase]) {
              itemsForWord.push({ 
                type: 'element',
                text: periodicTable[twoCharStandardCase].symbol,
                element: periodicTable[twoCharStandardCase]
              });
              i += 2;
              charProcessed = true;
            }
          }

          if (!charProcessed) {
            const oneCharOriginalCase = remainingWord.substring(i, i + 1);
            const oneCharStandardCase = oneCharOriginalCase.toUpperCase();
            if (periodicTable[oneCharStandardCase]) {
               itemsForWord.push({
                 type: 'element',
                 text: periodicTable[oneCharStandardCase].symbol,
                 element: periodicTable[oneCharStandardCase]
               });
              i += 1;
              charProcessed = true;
            }
          }

          if (!charProcessed) {
             const currentSymbol = remainingWord.substring(i, i + 1);
             const symbolElement = getSymbolElementData(currentSymbol);
             if (symbolElement) {
                itemsForWord.push({ 
                   type: 'element',
                   text: symbolElement.symbol,
                   element: symbolElement
                });
                i += 1;
                charProcessed = true;
             }
          }

          if (!charProcessed) {
            const unmatchedChar = remainingWord.substring(i, i + 1);
             const unknownElement: PeriodicElement = {
                symbol: unmatchedChar,
                name: 'Unknown',
                atomicNumber: 0,
                atomicWeight: 'N/A',
                category: 'unknown'
             };
            itemsForWord.push({ type: 'element', text: unmatchedChar, element: unknownElement });
            i += 1;
          }
        }
      }
      
      const itemsToRender = itemsForWord.filter(item => !(item.type === 'element' && item.element.category === 'unknown'));
      return { wordIdx, items: itemsToRender, word };
    })
    .filter(wordData => wordData.items.length > 0);

  // Group words into rows (approximately 4-6 words per row)
  const wordsPerRow = 5;
  const rows = [];
  for (let i = 0; i < processedWords.length; i += wordsPerRow) {
    rows.push(processedWords.slice(i, i + wordsPerRow));
  }

  return (
    <div className={cn(
      'flex flex-col w-full h-full p-4 overflow-hidden text-white transition-all duration-500 ease-in-out relative',
      getMainAxisClass(),
      getCrossAxisClass(),
      getBackgroundEffectClass(),
      animating ? 'opacity-50' : 'opacity-100'
    )}
    style={{
      background: animationBackgroundColor === 'bg-black' ? '#000000' :
                 animationBackgroundColor === 'bg-blue-900' ? '#1e3a8a' :
                 animationBackgroundColor === 'bg-red-900' ? '#7f1d1d' :
                 animationBackgroundColor === 'bg-purple-900' ? '#581c87' :
                 animationBackgroundColor === 'bg-green-900' ? '#14532d' : '#000000'
    }}>
      {rows.map((row, rowIdx) => (
        <div 
          key={`${animationKey}-row-${rowIdx}`}
          className="flex flex-wrap items-center justify-center gap-x-2 mb-1"
          style={{
            animationDelay: `${rowIdx * 100}ms`
          }}
        >
          {row.map((wordData) => (
            <div key={`${animationKey}-word-${wordData.wordIdx}`} className="flex items-center group">
              <div className="flex items-center gap-0.5">
                {wordData.items.map((item, itemIdx) => {
                  const totalDelay = (rowIdx * 100) + (itemIdx * 30);

                  if (item.type === 'emoji') {
                    return (
                      <div 
                        key={`${animationKey}-emoji-${wordData.wordIdx}-${itemIdx}`} 
                        className={cn(
                          "element-tile flex flex-col items-center justify-between rounded-xl shadow-sm w-14 h-14 p-1 relative border border-white/10 transition-all duration-300 ease-out transform hover:scale-105", 
                          chemistryTileColor,
                          getAnimationClass()
                        )}
                        style={{ animationDelay: `${totalDelay}ms` }}
                      >
                        <span className="atomic-number opacity-0">0</span>
                        <div className="flex flex-col items-center justify-center flex-grow w-full">
                          <span className="element-symbol text-base font-bold leading-none text-white">{item.emoji}</span>
                          <span className="element-name text-[7px] font-medium text-center leading-tight text-white whitespace-normal break-words opacity-90">{item.word}</span>
                        </div>
                        <span className="element-weight opacity-0">N/A</span>
                      </div>
                    );
                  } else if (item.type === 'element') {
                    return (
                      <div 
                        key={`${animationKey}-element-wrapper-${wordData.wordIdx}-${itemIdx}`} 
                        style={{ animationDelay: `${totalDelay}ms` }} 
                        className={cn(
                          "transition-all duration-300 ease-out transform hover:scale-105",
                          getAnimationClass()
                        )}
                      >
                        <ElementTile
                          key={`${animationKey}-element-${wordData.wordIdx}-${itemIdx}-${item.text}`}
                          symbol={item.element.symbol}
                          name={item.element.name}
                          atomicNumber={item.element.atomicNumber}
                          atomicWeight={item.element.atomicWeight}
                          category={item.element.category}
                          className={chemistryTileColor}
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default LyricsDisplay;