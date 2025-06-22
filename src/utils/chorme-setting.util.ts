import * as os from 'os';
import * as path from 'path';

type ChromeProfileSettings = {
  userDataDir: string;
  executablePath: string;
};

export const getChromeProfileSettings = (): ChromeProfileSettings => {
  const platform = os.platform();

  if (platform === 'darwin') {
    return {
      userDataDir: path.join(
        os.homedir(),
        'Library/Application Support/Google/Chrome/Default',
      ),
      executablePath:
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    };
  }

  if (platform === 'win32') {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local');
    return {
      userDataDir: path.join(localAppData, 'Google/Chrome/User Data/Default'),
      executablePath:
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    };
  }

  throw new Error('Unsupported platform: ' + platform);
};
