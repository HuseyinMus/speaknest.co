/**
 * Kimlik bilgilerini cookie olarak ayarlamak için yardımcı işlev
 * Bu işlev istemci tarafında çalışır ve API'ye kullanıcı bilgilerini gönderir
 */
export async function setAuthCookie(userData: {
  uid: string;
  role: string;
}): Promise<boolean> {
  try {
    // API'ye kullanıcı bilgilerini gönder ve cookie oluştur
    const response = await fetch('/api/auth/cookie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    // Yanıt başarılı mı kontrol et
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cookie oluşturma hatası:', errorData);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Cookie oluşturma işlemi başarısız:', error);
    return false;
  }
}

/**
 * Kimlik bilgilerini cookie olarak silen yardımcı işlev
 * Bu işlev istemci tarafında çalışır ve API'ye silme isteği gönderir
 */
export async function deleteAuthCookie(): Promise<boolean> {
  try {
    // API'ye cookie silme isteği gönder
    const response = await fetch('/api/auth/cookie', {
      method: 'DELETE',
    });
    
    // Yanıt başarılı mı kontrol et
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cookie silme hatası:', errorData);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Cookie silme işlemi başarısız:', error);
    return false;
  }
} 