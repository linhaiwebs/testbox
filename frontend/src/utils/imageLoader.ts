// 图片资源加载器
const imageModules = import.meta.glob('../assets/picture/*.{png,jpg,jpeg,gif,svg,webp}', { 
  eager: true,
  as: 'url'
});

// 创建图片映射对象
export const images: Record<string, string> = {};

// 处理图片路径，提取文件名作为key
Object.entries(imageModules).forEach(([path, url]) => {
  const fileName = path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
  images[fileName] = url as string;
});

// 辅助函数：根据文件名获取图片URL
export const getImage = (fileName: string): string => {
  return images[fileName] || '';
};

// 辅助函数：获取所有图片
export const getAllImages = (): Record<string, string> => {
  return images;
};