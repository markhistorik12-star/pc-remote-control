using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace PCRemote.Agent.Services;

/// <summary>
/// Uses Windows Shell IShellItemImageFactory + 32-bit DIB pixel copy to extract crisp,
/// alpha-preserved PNG icons for Win32 apps, UWP/Microsoft Store apps (shell:AppsFolder),
/// shortcuts (.lnk), and games—identical to the Windows 11 Start Menu.
/// </summary>
public static class ShellIconExtractor
{
    [StructLayout(LayoutKind.Sequential)]
    public struct SIZE
    {
        public int cx;
        public int cy;
        public SIZE(int cx, int cy) { this.cx = cx; this.cy = cy; }
    }

    [Flags]
    private enum SIIGBF
    {
        SIIGBF_RESIZETOFIT = 0x00,
        SIIGBF_BIGGERSIZEOK = 0x01,
        SIIGBF_MEMORYONLY = 0x02,
        SIIGBF_ICONONLY = 0x04,
        SIIGBF_THUMBNAILONLY = 0x08,
        SIIGBF_INCACHEONLY = 0x10,
    }

    [ComImport]
    [Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItemImageFactory
    {
        [PreserveSig]
        int GetImage([In, MarshalAs(UnmanagedType.Struct)] SIZE size, [In] SIIGBF flags, out IntPtr phbm);
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = true)]
    private static extern int SHCreateItemFromParsingName(
        [MarshalAs(UnmanagedType.LPWStr)] string pszPath,
        IntPtr pbc,
        [In] ref Guid riid,
        [MarshalAs(UnmanagedType.Interface)] out IShellItemImageFactory? ppv);

    [StructLayout(LayoutKind.Sequential)]
    private struct BITMAP
    {
        public int bmType;
        public int bmWidth;
        public int bmHeight;
        public int bmWidthBytes;
        public ushort bmPlanes;
        public ushort bmBitsPixel;
        public IntPtr bmBits;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct BITMAPINFOHEADER
    {
        public uint biSize;
        public int biWidth;
        public int biHeight;
        public ushort biPlanes;
        public ushort biBitCount;
        public uint biCompression;
        public uint biSizeImage;
        public int biXPelsPerMeter;
        public int biYPelsPerMeter;
        public uint biClrUsed;
        public uint biClrImportant;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct BITMAPINFO
    {
        public BITMAPINFOHEADER bmiHeader;
        public uint bmiColors;
    }

    [DllImport("gdi32.dll")]
    private static extern int GetObject(IntPtr hgdiobj, int cbBuffer, out BITMAP lpvObject);

    [DllImport("gdi32.dll")]
    private static extern int GetDIBits(
        IntPtr hdc, IntPtr hbmp, uint uStartScan, uint cScanLines,
        [Out] byte[] lpvBits, ref BITMAPINFO lpbi, uint uUsage);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr hObject);

    [DllImport("user32.dll")]
    private static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

    public static byte[]? ExtractPngBytes(string parsingNameOrPath, int targetSize = 64)
    {
        if (string.IsNullOrWhiteSpace(parsingNameOrPath)) return null;

        var iid = new Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b");
        int hr = SHCreateItemFromParsingName(parsingNameOrPath, IntPtr.Zero, ref iid, out var factory);
        if (hr != 0 || factory is null)
        {
            return FallbackAssociatedIcon(parsingNameOrPath, targetSize);
        }

        IntPtr hBitmap = IntPtr.Zero;
        try
        {
            hr = factory.GetImage(new SIZE(targetSize, targetSize), SIIGBF.SIIGBF_BIGGERSIZEOK | SIIGBF.SIIGBF_ICONONLY, out hBitmap);
            if (hr != 0 || hBitmap == IntPtr.Zero)
            {
                hr = factory.GetImage(new SIZE(targetSize, targetSize), SIIGBF.SIIGBF_RESIZETOFIT, out hBitmap);
            }

            if (hr != 0 || hBitmap == IntPtr.Zero)
            {
                return FallbackAssociatedIcon(parsingNameOrPath, targetSize);
            }

            var png = HBitmapToPngWithAlpha(hBitmap, targetSize);
            return png ?? FallbackAssociatedIcon(parsingNameOrPath, targetSize);
        }
        catch
        {
            return FallbackAssociatedIcon(parsingNameOrPath, targetSize);
        }
        finally
        {
            if (hBitmap != IntPtr.Zero) DeleteObject(hBitmap);
            Marshal.ReleaseComObject(factory);
        }
    }

    private static byte[]? HBitmapToPngWithAlpha(IntPtr hBitmap, int targetSize)
    {
        if (GetObject(hBitmap, Marshal.SizeOf<BITMAP>(), out var bm) == 0 || bm.bmWidth <= 0 || bm.bmHeight <= 0)
            return null;

        int w = bm.bmWidth;
        int h = Math.Abs(bm.bmHeight);

        var bmi = new BITMAPINFO();
        bmi.bmiHeader.biSize = (uint)Marshal.SizeOf<BITMAPINFOHEADER>();
        bmi.bmiHeader.biWidth = w;
        bmi.bmiHeader.biHeight = -h; // Top-down DIB
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = 0; // BI_RGB

        var pixels = new byte[w * h * 4];
        IntPtr hdc = GetDC(IntPtr.Zero);
        try
        {
            if (GetDIBits(hdc, hBitmap, 0, (uint)h, pixels, ref bmi, 0) == 0)
                return null;
        }
        finally
        {
            ReleaseDC(IntPtr.Zero, hdc);
        }

        // Check alpha & non-blank content
        bool hasAlphaChannel = false;
        bool hasAnyVisiblePixel = false;
        for (int i = 0; i < pixels.Length; i += 4)
        {
            byte b = pixels[i];
            byte g = pixels[i + 1];
            byte r = pixels[i + 2];
            byte a = pixels[i + 3];
            if (a > 10)
            {
                hasAlphaChannel = true;
                hasAnyVisiblePixel = true;
            }
            else if (r > 10 || g > 10 || b > 10)
            {
                hasAnyVisiblePixel = true;
            }
        }

        if (!hasAnyVisiblePixel) return null;

        // If 24-bit icon returned with alpha=0 everywhere, set opaque alpha=255 on non-black pixels
        if (!hasAlphaChannel)
        {
            for (int i = 0; i < pixels.Length; i += 4)
            {
                if (pixels[i] != 0 || pixels[i + 1] != 0 || pixels[i + 2] != 0)
                    pixels[i + 3] = 255;
            }
        }

        using var srcBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        var bmpData = srcBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        try
        {
            Marshal.Copy(pixels, 0, bmpData.Scan0, pixels.Length);
        }
        finally
        {
            srcBmp.UnlockBits(bmpData);
        }

        using var finalBmp = new Bitmap(targetSize, targetSize, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(finalBmp))
        {
            g.Clear(Color.Transparent);
            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
            g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
            g.DrawImage(srcBmp, new Rectangle(0, 0, targetSize, targetSize));
        }

        using var ms = new MemoryStream();
        finalBmp.Save(ms, ImageFormat.Png);
        return ms.ToArray();
    }

    private static byte[]? FallbackAssociatedIcon(string path, int targetSize)
    {
        try
        {
            if (!File.Exists(path)) return null;
            using var ico = Icon.ExtractAssociatedIcon(path);
            if (ico is null) return null;

            using var bmp = new Bitmap(targetSize, targetSize, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
                g.DrawIcon(ico, new Rectangle(0, 0, targetSize, targetSize));
            }

            using var ms = new MemoryStream();
            bmp.Save(ms, ImageFormat.Png);
            return ms.ToArray();
        }
        catch
        {
            return null;
        }
    }
}
