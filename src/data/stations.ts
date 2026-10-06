import type { RadioStation } from '../types';

// Resmî web oynatıcısından doğrulanan ana adres; geçici UserCode adresi saklanmaz.
export const RADIO_STREAM_URL =
  'https://stream.radyotvonline.net/hls/play/kafaradyo.m3u8';
// Ek radyoların adresleri resmî web oynatıcılarından alınarak ses akışı doğrulandı.
export const stations: RadioStation[] = [
  {
    id: 'kafa-radyo',
    name: 'Kafa Radyo',
    streamUrl: RADIO_STREAM_URL,
    // Ayrı sunucu ve ses parçası alan adı: bir sağlayıcı yolu engellenirse kullanılır.
    fallbackStreamUrls: [
      'https://moondigitaledge2.radyotvonline.net/kafaradyo/playlist.m3u8',
    ],
    website: 'https://www.kafaradyo.com',
    description: 'Türkiye’nin en kafa radyosu',
  },
  {
    id: 'slowturk',
    name: 'SlowTürk',
    streamUrl: 'https://stream.radyotvonline.net/hls/play/slowturk.m3u8',
    website: 'https://www.slowturk.com.tr/',
    description: 'Aşkın frekansı',
  },
  {
    id: 'kral-fm',
    name: 'Kral FM',
    streamUrl: 'https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8',
    website: 'https://www.kralmuzik.com.tr/radyo/kral-fm',
    description: 'Arabesk ve fantezi müzik',
  },
  {
    id: 'radyo-turk',
    name: 'Radyo Türk 94.4',
    streamUrl: 'https://radyo.yayindakiler.com:4028/;',
    website: 'https://www.radyoturk.com.tr/',
    description: 'Bursa’dan Türkçe müzik',
  },
  {
    id: 'trt-fm',
    name: 'TRT FM',
    streamUrl: 'https://trt.radyotvonline.net/trtfm',
    website: 'https://radyo.trt.net.tr/',
    description: 'Türkçe pop müzik',
  },
  {
    id: 'trt-radyo-1',
    name: 'TRT Radyo 1',
    streamUrl: 'https://trt.radyotvonline.net/trt1',
    website: 'https://radyo.trt.net.tr/',
    description: 'Haber, kültür ve radyo programları',
  },
];
export const defaultStation = stations[0];
